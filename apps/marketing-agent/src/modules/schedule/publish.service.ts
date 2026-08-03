import { prisma } from '../../lib/prisma.js';
import { getLinkedinClient } from '../../lib/linkedin/index.js';
import { buildUtmUrl } from '../../lib/utm.js';
import { writeAudit } from '../../lib/audit.js';
import { logger } from '../../lib/logger.js';
import { classifyAttempt } from '../../lib/linkedin/retryClassification.js';

// Shared by both the manual "publish now" endpoint and the scheduler worker,
// so there is exactly one code path that ever calls the LinkedIn client to
// publish — critical for the duplicate-publication guarantee.

export type PublishOutcome =
  | { outcome: 'already_in_progress_or_not_eligible' }
  | { outcome: 'published' }
  | { outcome: 'failed_will_retry' }
  | { outcome: 'failed_final' };

// Atomically claims the draft (SCHEDULED -> PUBLISHING) so two worker ticks —
// or a worker tick racing a manual "publish now" click — can never both
// publish the same draft. This conditional updateMany *is* the lock.
export async function attemptPublish(draftId: number, actorId: number | null): Promise<PublishOutcome> {
  const claim = await prisma.contentDraft.updateMany({
    where: { id: draftId, status: 'SCHEDULED' },
    data: { status: 'PUBLISHING' },
  });
  if (claim.count === 0) return { outcome: 'already_in_progress_or_not_eligible' };

  const draft = await prisma.contentDraft.findUniqueOrThrow({
    where: { id: draftId },
    include: { brief: { include: { pillar: true } }, campaign: true },
  });
  const previousAttempts = await prisma.publicationAttempt.count({ where: { draftId } });
  const attemptNumber = previousAttempts + 1;

  const client = getLinkedinClient();
  const destinationUrl = draft.destinationUrl
    ? buildUtmUrl(draft.destinationUrl, { campaign: draft.campaign?.key ?? 'organic', content: draft.id })
    : undefined;

  const result = await client.publishPost({ body: draft.body, destinationUrl });

  if (result.success && result.linkedinPostUrn) {
    await prisma.$transaction([
      prisma.publicationAttempt.create({
        data: {
          draftId,
          attemptNumber,
          requestId: result.requestId,
          status: 'SUCCESS',
          providerResponseCode: result.providerResponseCode,
          completedAt: new Date(),
        },
      }),
      prisma.publishedPost.create({
        data: {
          draftId,
          organizationUrn: result.organizationUrn,
          linkedinPostUrn: result.linkedinPostUrn,
          publishedUrl: result.publishedUrl,
        },
      }),
      prisma.contentDraft.update({ where: { id: draftId }, data: { status: 'PUBLISHED', publishedAt: new Date() } }),
    ]);

    // Best-effort initial analytics capture (works today via the mock
    // client; a real client would do the same once connected).
    try {
      const analytics = await client.fetchAnalytics(result.linkedinPostUrn);
      const publishedPost = await prisma.publishedPost.findUnique({ where: { draftId } });
      if (publishedPost) {
        await prisma.postAnalytics.create({
          data: {
            publishedPostId: publishedPost.id,
            ...analytics,
            postFormat: draft.contentType,
            contentPillarKey: draft.brief?.pillar?.key,
            campaignKey: draft.campaign?.key,
          },
        });
      }
    } catch (err) {
      logger.warn({ err, draftId }, 'Initial analytics capture failed; publication itself still succeeded.');
    }

    await writeAudit({ actorId, action: 'draft.publish.success', entityType: 'ContentDraft', entityId: draftId, metadata: { linkedinPostUrn: result.linkedinPostUrn } });
    return { outcome: 'published' };
  }

  const { attemptStatus, willRetry } = classifyAttempt(result, attemptNumber);
  await prisma.publicationAttempt.create({
    data: {
      draftId,
      attemptNumber,
      requestId: result.requestId,
      status: attemptStatus,
      providerResponseCode: result.providerResponseCode,
      safeErrorMessage: result.safeErrorMessage,
      completedAt: new Date(),
    },
  });

  await prisma.contentDraft.update({
    where: { id: draftId },
    data: { status: willRetry ? 'SCHEDULED' : 'FAILED' },
  });

  await writeAudit({
    actorId,
    action: willRetry ? 'draft.publish.retry_scheduled' : 'draft.publish.failed',
    entityType: 'ContentDraft',
    entityId: draftId,
    metadata: { errorCode: result.errorCode, safeErrorMessage: result.safeErrorMessage, attemptNumber },
  });

  if (!willRetry) {
    // Administrator alert hook. No email/SMS integration in this build (it
    // would need a connected organization's contact details) — logged loudly
    // so it's visible in any log aggregator, and documented as a Phase 6+
    // extension point in docs/marketing-agent/KNOWN_LIMITATIONS.md.
    logger.error({ draftId, errorCode: result.errorCode, safeErrorMessage: result.safeErrorMessage }, 'ALERT: publication failed permanently and will not auto-retry.');
  }

  return { outcome: willRetry ? 'failed_will_retry' : 'failed_final' };
}
