import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../lib/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';

export const consentsRouter = Router();
consentsRouter.use(requireAuth);

// Fields exactly per spec §14.
consentsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const consents = await prisma.contentConsent.findMany({ orderBy: { createdAt: 'desc' }, include: { mediaAssets: true } });
    res.json({ consents });
  }),
);

const createSchema = z.object({
  subjectDescription: z.string().min(1),
  scope: z.string().min(1),
  approvedWording: z.string().optional(),
  approvedImageAssetId: z.number().int().optional(),
  platformsAllowed: z.array(z.string()).default(['linkedin']),
  startDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date().optional(),
  evidenceReference: z.string().min(1),
});

consentsRouter.post(
  '/',
  validate({ body: createSchema }),
  asyncHandler(async (req, res) => {
    const consent = await prisma.contentConsent.create({ data: { ...req.body, createdBy: req.adminUser!.id } });
    await writeAudit({ actorId: req.adminUser!.id, action: 'consent.create', entityType: 'ContentConsent', entityId: consent.id });
    res.status(201).json({ consent });
  }),
);

// Withdrawal (§14): stop reusing the material and flag existing published
// content that used it for review — never auto-delete already-published
// material.
consentsRouter.post(
  '/:id/withdraw',
  validate({ params: z.object({ id: z.coerce.number().int() }) }),
  asyncHandler(async (req, res) => {
    const consent = await prisma.contentConsent.findUnique({ where: { id: Number(req.params.id) }, include: { mediaAssets: true } });
    if (!consent) throw notFound();
    await prisma.contentConsent.update({ where: { id: consent.id }, data: { withdrawnAt: new Date() } });

    const mediaAssetIds = consent.mediaAssets.map((m) => m.id);
    const affectedPublished = mediaAssetIds.length
      ? await prisma.contentDraft.findMany({
          where: { mediaAssetId: { in: mediaAssetIds }, status: 'PUBLISHED' },
          select: { id: true, title: true, publishedAt: true },
        })
      : [];

    await writeAudit({
      actorId: req.adminUser!.id,
      action: 'consent.withdraw',
      entityType: 'ContentConsent',
      entityId: consent.id,
      metadata: { affectedPublishedDraftIds: affectedPublished.map((d) => d.id) },
    });
    res.json({ ok: true, affectedPublished });
  }),
);
