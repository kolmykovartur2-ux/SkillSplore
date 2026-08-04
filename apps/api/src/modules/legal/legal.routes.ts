import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../lib/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { LEGAL_DOCUMENTS } from '../../content/legal/index.js';
import { scanPlaceholders } from '../../lib/legalPlaceholders.js';
import { env } from '../../config/env.js';

export const legalRouter = Router();

const SLUG_BY_PATH = new Map(LEGAL_DOCUMENTS.map((d) => [d.path.replace(/^\//, ''), d]));

/** Public index of the policy documents and where they live. */
legalRouter.get(
  '/documents',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.legalDocument.findMany({
      include: { currentVersion: { select: { id: true, version: true, effectiveAt: true, legalReviewedAt: true } } },
    });
    const bySlug = new Map(rows.map((r) => [r.slug, r]));

    res.json({
      documents: LEGAL_DOCUMENTS.map((d) => {
        const row = bySlug.get(d.slug);
        return {
          slug: d.slug,
          title: d.title,
          path: d.path,
          requiresAcceptance: d.requiresAcceptance,
          publishedVersion: row?.currentVersion?.version ?? null,
          effectiveAt: row?.currentVersion?.effectiveAt ?? null,
          legallyReviewed: !!row?.currentVersion?.legalReviewedAt,
        };
      }),
    });
  }),
);

/**
 * Fetch a document for display.
 *
 * Falls back to the newest unpublished draft when nothing is published, which
 * is the normal state before launch. The response always says which it is, so
 * the page can render the "draft, not in force" banner honestly rather than
 * presenting an unreviewed draft as a live policy.
 */
legalRouter.get(
  '/documents/:path',
  asyncHandler(async (req, res) => {
    const def = SLUG_BY_PATH.get(String(req.params.path));
    if (!def) throw notFound('Unknown policy document.');

    const doc = await prisma.legalDocument.findUnique({
      where: { slug: def.slug },
      include: { currentVersion: true },
    });

    const version = doc?.currentVersion
      ?? (doc
        ? await prisma.legalDocumentVersion.findFirst({ where: { documentId: doc.id }, orderBy: { createdAt: 'desc' } })
        : null);

    // Falling back to the in-source body keeps the policy pages working even
    // if the boot sync has not run yet (fresh database, first request).
    const body = version?.body ?? def.body;
    const { unresolved, occurrences } = scanPlaceholders(body);

    res.json({
      slug: def.slug,
      title: def.title,
      path: def.path,
      body,
      version: version?.version ?? null,
      isPublished: !!doc?.currentVersionId && doc.currentVersionId === version?.id,
      isLegallyReviewed: !!version?.legalReviewedAt,
      effectiveAt: version?.effectiveAt ?? null,
      // Surfaced so the UI can show "9 details still to be filled in" rather
      // than silently rendering [[LEGAL_ENTITY_NAME]] to a user.
      unresolvedPlaceholders: unresolved,
      placeholderOccurrences: occurrences,
    });
  }),
);

/** Which required documents the signed-in user has yet to accept. */
legalRouter.get(
  '/acceptances',
  requireAuth,
  asyncHandler(async (req, res) => {
    const accepted = await prisma.userLegalAcceptance.findMany({
      where: { userId: req.user!.id },
      include: { version: { include: { document: { select: { slug: true, title: true } } } } },
      orderBy: { acceptedAt: 'desc' },
    });

    res.json({
      acceptances: accepted.map((a) => ({
        slug: a.version.document.slug,
        title: a.version.document.title,
        version: a.version.version,
        acceptedAt: a.acceptedAt,
        method: a.method,
      })),
    });
  }),
);

const acceptSchema = z.object({ versionId: z.number().int().positive() });

legalRouter.post(
  '/acceptances',
  requireAuth,
  validate({ body: acceptSchema }),
  asyncHandler(async (req, res) => {
    const { versionId } = req.body as z.infer<typeof acceptSchema>;
    const version = await prisma.legalDocumentVersion.findUnique({ where: { id: versionId } });
    if (!version) throw badRequest('Unknown document version.');

    // Upsert rather than create: re-accepting the same version is a harmless
    // no-op (a double-submitted form), not an error worth showing a user.
    await prisma.userLegalAcceptance.upsert({
      where: { userId_versionId: { userId: req.user!.id, versionId } },
      create: {
        userId: req.user!.id,
        versionId,
        method: 'explicit-acceptance',
        ipAddress: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      },
      update: {},
    });

    res.status(201).json({ ok: true });
  }),
);

/**
 * Machine-readable statement of the platform's data-monetisation posture.
 *
 * Exists so the claim in the Privacy Policy is verifiable from outside rather
 * than being only prose. The tests assert on this endpoint, and it is a
 * cheap way for the founder (or a prospective acquirer) to confirm the
 * production configuration actually matches what the policy says.
 */
legalRouter.get('/data-practices', (_req, res) => {
  res.json({
    sellsPersonalData: env.sellPersonalData,
    sellsChildData: env.sellChildData,
    behaviouralAdvertising: env.behaviouralAdvertisingEnabled,
    usesMessagesForAdvertising: env.useMessagesForAdvertising,
    dataInsightsProgramEnabled: env.dataInsightsProgramEnabled,
    statement:
      'SkillSplore does not sell personal information or user-level behavioural profiles. '
      + 'We may create aggregated statistical reports about broad platform activity where '
      + 'individuals are not reasonably identifiable.',
  });
});
