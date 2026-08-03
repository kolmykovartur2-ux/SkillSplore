import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { env } from '../../config/env.js';
import { attemptPublish } from './publish.service.js';

// Bounded exponential backoff between retry attempts (§30). Index 0 = wait
// after the 1st failed attempt before the 2nd try, etc. Matches
// MAX_TRANSIENT_ATTEMPTS = 3 in publish.service.ts.
const BACKOFF_MINUTES = [1, 5, 30];

async function isRetryDue(draftId: number): Promise<boolean> {
  const lastAttempt = await prisma.publicationAttempt.findFirst({ where: { draftId }, orderBy: { attemptedAt: 'desc' } });
  if (!lastAttempt) return true; // never attempted yet
  const waitMinutes = BACKOFF_MINUTES[Math.min(lastAttempt.attemptNumber - 1, BACKOFF_MINUTES.length - 1)]!;
  const dueAt = new Date(lastAttempt.attemptedAt.getTime() + waitMinutes * 60000);
  return dueAt <= new Date();
}

// One scheduler tick: publishes only already-*approved-then-scheduled*
// content whose time has arrived (§7, §30) — this function can never cause
// unapproved content to publish, because only APPROVED drafts can ever reach
// SCHEDULED status in the first place (enforced in schedule.routes.ts).
export async function runSchedulerTick(): Promise<{ attempted: number; published: number }> {
  if (!env.AUTO_PUBLISH_APPROVED_POSTS) {
    return { attempted: 0, published: 0 };
  }

  const due = await prisma.contentDraft.findMany({
    where: { status: 'SCHEDULED', scheduledFor: { lte: new Date() } },
    select: { id: true },
    orderBy: { scheduledFor: 'asc' },
  });

  let attempted = 0;
  let published = 0;
  for (const { id } of due) {
    if (!(await isRetryDue(id))) continue;
    attempted++;
    try {
      const result = await attemptPublish(id, null);
      if (result.outcome === 'published') published++;
    } catch (err) {
      logger.error({ err, draftId: id }, 'Scheduler tick: unexpected error attempting publish.');
    }
  }
  return { attempted, published };
}
