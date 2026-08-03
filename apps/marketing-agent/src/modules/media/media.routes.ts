import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../lib/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';
import { badRequest, conflict, notFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { storage } from '../../lib/storage.js';

export const mediaRouter = Router();
mediaRouter.use(requireAuth);

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });

mediaRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const assets = await prisma.mediaAsset.findMany({ orderBy: { createdAt: 'desc' }, include: { consent: true } });
    res.json({ assets });
  }),
);

const metaSchema = z.object({
  kind: z.enum(['LOGO', 'SCREENSHOT', 'PHOTO', 'DIAGRAM', 'POST_IMAGE', 'OTHER']),
  attribution: z.string().optional(),
  usageRights: z.string().min(1),
  consentId: z.coerce.number().int().optional(),
});

// Every external image must have documented usage rights (§19) — enforced
// here at the API boundary, not left to UI-only validation.
mediaRouter.post(
  '/',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest('No file uploaded.');
    if (!ALLOWED_MIME.has(req.file.mimetype)) throw badRequest('Unsupported file type.');
    const meta = metaSchema.parse({
      kind: req.body.kind,
      attribution: req.body.attribution,
      usageRights: req.body.usageRights,
      consentId: req.body.consentId,
    });

    const stored = await storage.put('media', req.file.originalname, req.file.buffer, req.file.mimetype);
    const asset = await prisma.mediaAsset.create({
      data: {
        filename: req.file.originalname,
        storageKey: stored.key,
        mimeType: stored.contentType,
        kind: meta.kind,
        attribution: meta.attribution,
        usageRights: meta.usageRights,
        consentId: meta.consentId,
        createdBy: req.adminUser!.id,
      },
    });
    await writeAudit({ actorId: req.adminUser!.id, action: 'media.upload', entityType: 'MediaAsset', entityId: asset.id });
    res.status(201).json({ asset });
  }),
);

mediaRouter.delete(
  '/:id',
  validate({ params: z.object({ id: z.coerce.number().int() }) }),
  asyncHandler(async (req, res) => {
    const asset = await prisma.mediaAsset.findUnique({ where: { id: Number(req.params.id) }, include: { drafts: true } });
    if (!asset) throw notFound();
    if (asset.drafts.length > 0) throw conflict('This asset is used by one or more drafts and cannot be deleted.');
    await storage.delete(asset.storageKey);
    await prisma.mediaAsset.delete({ where: { id: asset.id } });
    await writeAudit({ actorId: req.adminUser!.id, action: 'media.delete', entityType: 'MediaAsset', entityId: asset.id });
    res.json({ ok: true });
  }),
);
