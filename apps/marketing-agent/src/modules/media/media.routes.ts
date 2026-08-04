import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../lib/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';
import { badRequest, conflict, notFound, upstreamFailed } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { storage } from '../../lib/storage.js';
import { env } from '../../config/env.js';
import { configuredImageProvider } from '../../lib/imageGenerationProvider.js';
import { PERSONAS, buildImagePrompt, findPersona, generatedUsageRights } from '../../lib/imagePrompt.js';

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

// The persona catalogue and whether generation is even available — lets the
// dashboard render the right thing instead of guessing at the config.
mediaRouter.get(
  '/personas',
  asyncHandler(async (_req, res) => {
    res.json({
      personas: PERSONAS.map((p) => ({ key: p.key, label: p.label })),
      imageGenerationConfigured: env.imageGenerationConfigured,
      provider: configuredImageProvider.name,
    });
  }),
);

const generateSchema = z.object({
  personaKey: z.string().min(1),
  topic: z.string().max(300).optional(),
  pillarName: z.string().max(120).optional(),
});

// Generate post creative for a persona. The prompt is built deterministically
// (lib/imagePrompt.ts) so the safety constraints can't be edited away from the
// client — the request only chooses a persona and an optional theme.
mediaRouter.post(
  '/generate',
  validate({ body: generateSchema }),
  asyncHandler(async (req, res) => {
    if (!env.imageGenerationConfigured) {
      res.status(501).json({
        error: {
          code: 'not_configured',
          message:
            'Image generation is not configured. Set IMAGE_AI_PROVIDER (openai_compatible or automatic1111) and IMAGE_AI_BASE_URL for this service, then restart. See docs/marketing-agent/IMAGE_GENERATION.md.',
        },
      });
      return;
    }

    const persona = findPersona(req.body.personaKey);
    if (!persona) throw badRequest(`Unknown persona "${req.body.personaKey}".`);

    const prompt = buildImagePrompt({
      persona,
      topic: req.body.topic,
      pillarName: req.body.pillarName,
      launch: {
        country: env.MARKETPLACE_LAUNCH_COUNTRY,
        city: env.MARKETPLACE_LAUNCH_CITY,
        category: env.MARKETPLACE_LAUNCH_CATEGORY,
        stage: env.MARKETPLACE_LAUNCH_STAGE,
      },
    });

    let image;
    try {
      image = await configuredImageProvider.generateImage(prompt);
    } catch (err) {
      // Surface the provider's own words rather than a generic 500 — the same
      // reasoning as the LinkedIn OAuth failures.
      throw upstreamFailed(err instanceof Error ? err.message : 'Image generation failed.', 'image_generation_error');
    }

    const filename = `${persona.key}-${Date.now()}.png`;
    const stored = await storage.put('media/generated', filename, image.bytes, image.mimeType);

    const asset = await prisma.mediaAsset.create({
      data: {
        filename,
        storageKey: stored.key,
        mimeType: stored.contentType,
        kind: 'POST_IMAGE',
        // No ContentConsent is involved by design: these depict nobody real,
        // so there is no person whose consent could be sought or withdrawn.
        usageRights: generatedUsageRights(configuredImageProvider.name, image.model),
        attribution: `AI-generated (${configuredImageProvider.name})`,
        isAiGenerated: true,
        generationProvider: configuredImageProvider.name,
        generationModel: image.model,
        generationPrompt: image.revisedPrompt ?? prompt.prompt,
        personaKey: persona.key,
        createdBy: req.adminUser!.id,
      },
    });

    await writeAudit({
      actorId: req.adminUser!.id,
      action: 'media.generate',
      entityType: 'MediaAsset',
      entityId: asset.id,
    });
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
