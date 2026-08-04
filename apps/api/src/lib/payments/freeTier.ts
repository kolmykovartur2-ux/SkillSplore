/**
 * Free-tier slot allocation for the tutor signup fee.
 *
 * "The first 50 tutors are free" is a public promise. Handing out 60 slots
 * because two people submitted at the same moment is both a revenue leak and a
 * fairness problem, so allocation has to be correct under concurrency rather
 * than merely usually correct.
 *
 * The obvious implementation is wrong:
 *
 *     const used = await prisma.freeTierGrant.count();
 *     if (used < LIMIT) await prisma.freeTierGrant.create(...);
 *
 * That is check-then-act. Two requests can both read 49 and both insert.
 *
 * Instead a single-row counter is incremented with a guard in the same
 * statement:
 *
 *     UPDATE "PlatformCounter" SET value = value + 1
 *     WHERE key = 'free_tutor_signups' AND value < $limit
 *     RETURNING value
 *
 * Postgres takes a row lock for the duration of the UPDATE, so concurrent
 * callers serialise on it. Exactly $limit of them get a row back; the rest get
 * zero rows and pay. No retry loop, no advisory locks, no serializable
 * isolation.
 *
 * FreeTierGrant.slotNumber is additionally UNIQUE, so even if this function
 * were bypassed the database still refuses to issue a slot twice.
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { env } from '../../config/env.js';

export const FREE_TIER_COUNTER_KEY = 'free_tutor_signups';

/** Prisma client or an interactive-transaction client. */
type Db = PrismaClient | Prisma.TransactionClient;

export interface FreeTierClaim {
  granted: boolean;
  slotNumber?: number;
}

/**
 * Atomically claims a free-tier slot, if any remain.
 *
 * Call inside a transaction alongside whatever the slot is being granted for,
 * so a later failure releases the slot rather than burning it.
 */
export async function claimFreeTierSlot(db: Db, limit = env.FREE_SIGNUP_LIMIT): Promise<FreeTierClaim> {
  if (limit <= 0) return { granted: false };

  const rows = await db.$queryRaw<Array<{ value: number }>>`
    UPDATE "PlatformCounter"
    SET "value" = "value" + 1, "updatedAt" = NOW()
    WHERE "key" = ${FREE_TIER_COUNTER_KEY} AND "value" < ${limit}
    RETURNING "value"
  `;

  if (rows.length === 0) return { granted: false };
  return { granted: true, slotNumber: rows[0]!.value };
}

/**
 * How many free slots remain. Advisory only -- for display on a signup page.
 *
 * Never branch on this to decide whether to charge someone: between reading it
 * and acting on it another request may have taken the last slot. Call
 * `claimFreeTierSlot` and use its result, which cannot be stale.
 */
export async function freeSlotsRemaining(db: Db, limit = env.FREE_SIGNUP_LIMIT): Promise<number> {
  const counter = await db.platformCounter.findUnique({ where: { key: FREE_TIER_COUNTER_KEY } });
  const used = counter?.value ?? 0;
  return Math.max(0, limit - used);
}

/**
 * Releases a slot that was claimed but not used -- for example when the
 * surrounding transaction is being abandoned outside a database rollback.
 *
 * Guarded with `value > 0` so a double-release cannot drive the counter
 * negative and silently create extra free slots.
 */
export async function releaseFreeTierSlot(db: Db): Promise<void> {
  await db.$executeRaw`
    UPDATE "PlatformCounter"
    SET "value" = "value" - 1, "updatedAt" = NOW()
    WHERE "key" = ${FREE_TIER_COUNTER_KEY} AND "value" > 0
  `;
}
