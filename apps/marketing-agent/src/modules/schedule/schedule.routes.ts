import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../lib/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';
import { badRequest, conflict, notFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { env } from '../../config/env.js';
import { localWallTimeToUtc } from '../../lib/timezone.js';
import { checkCadenceConflicts } from '../../lib/cadence.js';
import { attemptPublish } from './publish.service.js';

export const scheduleRouter = Router();
scheduleRouter.use(requireAuth);

// Calendar feed (§11): drafts, scheduled posts, published posts and failed
// posts in a UTC range, for the day/week/month calendar views.
scheduleRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 7 * 86400000);
    const to = req.query.to ? new Date(String(req.query.to)) : new Date(Date.now() + 30 * 86400000);

    const [scheduled, published, failed] = await Promise.all([
      prisma.contentDraft.findMany({
        where: { status: { in: ['SCHEDULED', 'PUBLISHING'] }, scheduledFor: { gte: from, lte: to } },
        include: { schedule: true, campaign: true, brief: { include: { pillar: true } } },
      }),
      prisma.contentDraft.findMany({
        where: { status: 'PUBLISHED', publishedAt: { gte: from, lte: to } },
        include: { publishedPost: true, campaign: true, brief: { include: { pillar: true } } },
      }),
      prisma.contentDraft.findMany({
        where: { status: 'FAILED', updatedAt: { gte: from, lte: to } },
        include: { attempts: { orderBy: { attemptedAt: 'desc' }, take: 1 }, campaign: true, brief: { include: { pillar: true } } },
      }),
    ]);

    res.json({ timezone: env.DEFAULT_TIMEZONE, scheduled, published, failed });
  }),
);

const scheduleSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
  timezone: z.string().optional(),
  override: z.boolean().default(false),
});

scheduleRouter.post(
  '/drafts/:id/schedule',
  validate({ body: scheduleSchema, params: z.object({ id: z.coerce.number().int() }) }),
  asyncHandler(async (req, res) => {
    const draft = await prisma.contentDraft.findUnique({ where: { id: Number(req.params.id) } });
    if (!draft) throw notFound();
    if (draft.status !== 'APPROVED') throw conflict(`Only approved drafts can be scheduled (current status: ${draft.status}).`);

    const timezone = req.body.timezone ?? env.DEFAULT_TIMEZONE;
    const scheduledForUtc = localWallTimeToUtc(req.body, timezone);
    if (scheduledForUtc.getTime() < Date.now() - 60000) throw badRequest('Cannot schedule a post in the past.');

    const others = await prisma.contentSchedule.findMany({ where: { draftId: { not: draft.id } }, select: { scheduledForUtc: true } });
    const conflicts = checkCadenceConflicts(scheduledForUtc, others.map((o) => o.scheduledForUtc));
    if (conflicts.length > 0 && !req.body.override) {
      throw conflict('Scheduling this post conflicts with the default cadence.', { conflicts });
    }

    const [, updated] = await prisma.$transaction([
      prisma.contentSchedule.create({ data: { draftId: draft.id, scheduledForUtc, timezoneAtScheduling: timezone, createdBy: req.adminUser!.id } }),
      prisma.contentDraft.update({ where: { id: draft.id }, data: { status: 'SCHEDULED', scheduledFor: scheduledForUtc } }),
    ]);

    await writeAudit({ actorId: req.adminUser!.id, action: 'draft.schedule', entityType: 'ContentDraft', entityId: draft.id, metadata: { scheduledForUtc, overrode: conflicts.length > 0 } });
    res.json({ draft: updated, conflicts });
  }),
);

scheduleRouter.post(
  '/drafts/:id/unschedule',
  validate({ params: z.object({ id: z.coerce.number().int() }) }),
  asyncHandler(async (req, res) => {
    const draft = await prisma.contentDraft.findUnique({ where: { id: Number(req.params.id) }, include: { schedule: true } });
    if (!draft) throw notFound();
    if (draft.status !== 'SCHEDULED') throw conflict('Only scheduled drafts can be unscheduled.');
    await prisma.$transaction([
      prisma.contentSchedule.delete({ where: { draftId: draft.id } }),
      prisma.contentDraft.update({ where: { id: draft.id }, data: { status: 'APPROVED', scheduledFor: null } }),
    ]);
    await writeAudit({ actorId: req.adminUser!.id, action: 'draft.unschedule', entityType: 'ContentDraft', entityId: draft.id });
    res.json({ ok: true });
  }),
);

// Manual "publish now" — always available once scheduled, independent of
// AUTO_PUBLISH_APPROVED_POSTS (§7).
scheduleRouter.post(
  '/drafts/:id/publish-now',
  validate({ params: z.object({ id: z.coerce.number().int() }) }),
  asyncHandler(async (req, res) => {
    const draft = await prisma.contentDraft.findUnique({ where: { id: Number(req.params.id) } });
    if (!draft) throw notFound();
    if (draft.status !== 'SCHEDULED') throw conflict('Only scheduled drafts can be published.');
    const result = await attemptPublish(draft.id, req.adminUser!.id);
    res.json({ result: result.outcome });
  }),
);

// Manual retry after a final (permanent, or exhausted-retry) failure.
scheduleRouter.post(
  '/drafts/:id/retry',
  validate({ params: z.object({ id: z.coerce.number().int() }) }),
  asyncHandler(async (req, res) => {
    const draft = await prisma.contentDraft.findUnique({ where: { id: Number(req.params.id) } });
    if (!draft) throw notFound();
    if (draft.status !== 'FAILED') throw conflict('Only failed drafts can be retried.');
    if (!draft.scheduledFor) throw conflict('This draft has no schedule to retry against — schedule it again instead.');
    await prisma.contentDraft.update({ where: { id: draft.id }, data: { status: 'SCHEDULED' } });
    const result = await attemptPublish(draft.id, req.adminUser!.id);
    res.json({ result: result.outcome });
  }),
);
