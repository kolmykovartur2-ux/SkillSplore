import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../lib/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';
import { badRequest } from '../../lib/errors.js';
import { env } from '../../config/env.js';

export const consentRouter = Router();

const CONSENT_KINDS = ['MARKETING_EMAIL', 'DATA_INSIGHTS', 'ANALYTICS_COOKIES'] as const;

/**
 * The consent options available to a user, with the exact wording and the
 * full disclosure set for each.
 *
 * `granted` is computed from the user's own records. There is no
 * `defaultChecked` field anywhere in this response, by design: a client has
 * nothing to read that would make a box start ticked.
 */
consentRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const versions = await prisma.consentVersion.findMany({ orderBy: { createdAt: 'desc' } });

    // Newest version per kind.
    const latestByKind = new Map<string, (typeof versions)[number]>();
    for (const v of versions) if (!latestByKind.has(v.kind)) latestByKind.set(v.kind, v);

    const held = await prisma.userConsent.findMany({
      where: { userId: req.user!.id, withdrawnAt: null },
      select: { kind: true, grantedAt: true, versionId: true },
    });
    const heldByKind = new Map(held.map((h) => [h.kind, h]));

    res.json({
      consents: CONSENT_KINDS.map((kind) => {
        const v = latestByKind.get(kind);
        const current = heldByKind.get(kind);
        return {
          kind,
          available: kind === 'DATA_INSIGHTS' ? env.dataInsightsProgramEnabled : true,
          granted: !!current,
          grantedAt: current?.grantedAt ?? null,
          version: v?.version ?? null,
          versionId: v?.id ?? null,
          wording: v?.wording ?? null,
          purpose: v?.purpose ?? null,
          dataCategories: v?.dataCategories ?? [],
          excludedCategories: v?.excludedCategories ?? [],
          recipientCategories: v?.recipientCategories ?? [],
          countries: v?.countries ?? [],
          retentionSummary: v?.retentionSummary ?? null,
          withdrawalSummary: v?.withdrawalSummary ?? null,
          recipientsMustDeleteOnWithdrawal: v?.recipientsMustDeleteOnWithdrawal ?? false,
          priorDisclosuresReversible: v?.priorDisclosuresReversible ?? false,
        };
      }),
    });
  }),
);

const grantSchema = z.object({
  kind: z.enum(CONSENT_KINDS),
  versionId: z.number().int().positive(),
  // Must be sent explicitly and must be true. A client cannot grant consent by
  // omitting this, which is the API-level equivalent of refusing a pre-ticked
  // box.
  confirmed: z.literal(true),
});

consentRouter.post(
  '/',
  requireAuth,
  validate({ body: grantSchema }),
  asyncHandler(async (req, res) => {
    const b = req.body as z.infer<typeof grantSchema>;

    const version = await prisma.consentVersion.findUnique({ where: { id: b.versionId } });
    if (!version) throw badRequest('Unknown consent version.');
    if (version.kind !== b.kind) throw badRequest('Consent version does not match the requested kind.');

    // The insights programme is gated on config as well as consent. Without
    // this, a user could hold a valid consent for a programme that has not
    // passed legal review, and the consent record would imply it was running.
    if (b.kind === 'DATA_INSIGHTS' && !env.dataInsightsProgramEnabled) {
      throw badRequest('The Data Insights Programme is not currently available.');
    }

    const existing = await prisma.userConsent.findFirst({
      where: { userId: req.user!.id, kind: b.kind, withdrawnAt: null },
    });
    if (existing) {
      res.status(200).json({ ok: true, alreadyGranted: true });
      return;
    }

    await prisma.userConsent.create({
      data: {
        userId: req.user!.id,
        kind: b.kind,
        versionId: version.id,
        // Copied, not referenced. See the schema comment on UserConsent.
        grantedWording: version.wording,
        method: 'explicit-checkbox',
        ipAddress: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      },
    });

    res.status(201).json({ ok: true });
  }),
);

const withdrawSchema = z.object({
  kind: z.enum(CONSENT_KINDS),
  reason: z.string().max(500).optional(),
});

/**
 * Withdrawal is append-only: the original grant row keeps its wording and
 * timestamp and gains `withdrawnAt`, and a ConsentWithdrawal row records the
 * event. Nothing is deleted, so "did they ever agree, and to what?" stays
 * answerable after the fact.
 */
consentRouter.post(
  '/withdraw',
  requireAuth,
  validate({ body: withdrawSchema }),
  asyncHandler(async (req, res) => {
    const b = req.body as z.infer<typeof withdrawSchema>;

    const active = await prisma.userConsent.findFirst({
      where: { userId: req.user!.id, kind: b.kind, withdrawnAt: null },
      include: { consentVersion: true },
    });
    if (!active) {
      res.json({ ok: true, alreadyWithdrawn: true });
      return;
    }

    const now = new Date();
    await prisma.$transaction([
      prisma.userConsent.update({ where: { id: active.id }, data: { withdrawnAt: now } }),
      prisma.consentWithdrawal.create({
        data: {
          consentId: active.id,
          userId: req.user!.id,
          reason: b.reason ?? null,
          method: 'settings-toggle',
          withdrawnAt: now,
          // Only meaningful where something was actually disclosed onward.
          // Recorded honestly rather than optimistically: an aggregate report
          // already delivered cannot be recalled.
          downstreamDeletionStatus: active.consentVersion.recipientsMustDeleteOnWithdrawal
            ? 'DELETION_REQUESTED'
            : 'NOT_APPLICABLE',
        },
      }),
    ]);

    res.json({
      ok: true,
      priorDisclosuresReversible: active.consentVersion.priorDisclosuresReversible,
      recipientsMustDeleteOnWithdrawal: active.consentVersion.recipientsMustDeleteOnWithdrawal,
    });
  }),
);

/** Full consent history, including withdrawn grants — used by account settings. */
consentRouter.get(
  '/history',
  requireAuth,
  asyncHandler(async (req, res) => {
    const rows = await prisma.userConsent.findMany({
      where: { userId: req.user!.id },
      orderBy: { grantedAt: 'desc' },
      include: { consentVersion: { select: { version: true } }, withdrawals: true },
    });

    res.json({
      history: rows.map((r) => ({
        kind: r.kind,
        version: r.consentVersion.version,
        wording: r.grantedWording,
        method: r.method,
        grantedAt: r.grantedAt,
        withdrawnAt: r.withdrawnAt,
        withdrawals: r.withdrawals.map((w) => ({ withdrawnAt: w.withdrawnAt, reason: w.reason })),
      })),
    });
  }),
);
