/**
 * Signup-fee entitlement for a tutor profile.
 *
 * One question matters: **may this profile be submitted for review?** The
 * answer is yes when payments are off, when the profile took a free-tier slot,
 * or when a payment succeeded.
 *
 * The free-tier slot is claimed at submission rather than at account creation,
 * so slots go to people who actually finished a profile rather than to anyone
 * who registered an email address and left.
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { env } from '../../config/env.js';
import { claimFreeTierSlot } from './freeTier.js';

type Db = PrismaClient | Prisma.TransactionClient;

export type EntitlementReason =
  | 'payments-disabled'
  | 'free-tier'
  | 'paid'
  | 'payment-required';

export interface Entitlement {
  allowed: boolean;
  reason: EntitlementReason;
  amountCents?: number;
  currency?: string;
  slotNumber?: number;
}

/**
 * Read-only check. Does not claim a slot.
 *
 * Used to render "you will not be charged" on the review screen. The
 * authoritative decision happens in `entitleForSubmission`, because anything
 * read here can be stale by the time the user clicks.
 */
export async function checkEntitlement(db: Db, tutorProfileId: number): Promise<Entitlement> {
  if (!env.paymentsEnabled) return { allowed: true, reason: 'payments-disabled' };

  const grant = await db.freeTierGrant.findUnique({ where: { tutorProfileId } });
  if (grant) return { allowed: true, reason: 'free-tier', slotNumber: grant.slotNumber };

  const paid = await db.payment.findFirst({
    where: { tutorProfileId, kind: 'TUTOR_SIGNUP', status: 'SUCCEEDED' },
  });
  if (paid) return { allowed: true, reason: 'paid', amountCents: paid.amountCents, currency: paid.currency };

  return {
    allowed: false,
    reason: 'payment-required',
    amountCents: env.SIGNUP_FEE_CENTS,
    currency: env.SIGNUP_FEE_CURRENCY,
  };
}

/**
 * Authoritative check, run inside the submission transaction.
 *
 * Claims a free-tier slot if one is available and the profile does not already
 * have an entitlement. Because the claim and the profile status change share a
 * transaction, a failure after the claim releases the slot rather than burning
 * it.
 */
export async function entitleForSubmission(db: Db, tutorProfileId: number, userId: number): Promise<Entitlement> {
  const existing = await checkEntitlement(db, tutorProfileId);
  if (existing.allowed) return existing;

  const claim = await claimFreeTierSlot(db);
  if (!claim.granted) return existing; // payment-required

  await db.freeTierGrant.create({
    data: {
      userId,
      tutorProfileId,
      slotNumber: claim.slotNumber!,
      // Snapshotted so a later change to FREE_SIGNUP_LIMIT does not rewrite
      // the promise this person was admitted under.
      limitAtGrant: env.FREE_SIGNUP_LIMIT,
    },
  });

  return { allowed: true, reason: 'free-tier', slotNumber: claim.slotNumber };
}

/**
 * Creates (or reuses) a PENDING payment for a profile.
 *
 * Reuses an existing pending row rather than creating a second one: a user who
 * clicks "pay" twice should land on the same checkout, not open two.
 */
export async function ensurePendingPayment(
  db: Db,
  opts: { userId: number; tutorProfileId: number },
) {
  const existing = await db.payment.findFirst({
    where: { tutorProfileId: opts.tutorProfileId, kind: 'TUTOR_SIGNUP', status: 'PENDING' },
  });
  if (existing) return existing;

  return db.payment.create({
    data: {
      userId: opts.userId,
      tutorProfileId: opts.tutorProfileId,
      kind: 'TUTOR_SIGNUP',
      status: 'PENDING',
      // Read from config, never from the client. A request body that could
      // set its own price is the oldest bug in online payments.
      amountCents: env.SIGNUP_FEE_CENTS,
      currency: env.SIGNUP_FEE_CURRENCY,
      provider: env.PAYMENT_PROVIDER,
      idempotencyKey: randomUUID(),
    },
  });
}

/** Formats cents for display: 1299 -> "$12.99". */
export function formatMoney(cents: number, currency: string): string {
  return `$${(cents / 100).toFixed(2)} ${currency}`;
}
