import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../lib/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { withProviderFallback } from '../../lib/contentGenerationProvider.js';
import { getLaunchContext } from '../../lib/launch.js';

export const briefsRouter = Router();
briefsRouter.use(requireAuth);

briefsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const briefs = await prisma.contentBrief.findMany({ orderBy: { createdAt: 'desc' }, include: { pillar: true, idea: true } });
    res.json({ briefs });
  }),
);

briefsRouter.get(
  '/:id',
  validate({ params: z.object({ id: z.coerce.number().int() }) }),
  asyncHandler(async (req, res) => {
    const brief = await prisma.contentBrief.findUnique({ where: { id: Number(req.params.id) }, include: { pillar: true, idea: true, drafts: true } });
    if (!brief) throw notFound();
    res.json({ brief });
  }),
);

// Fields exactly per spec §12.
const createSchema = z.object({
  ideaId: z.number().int().optional(),
  pillarId: z.number().int().optional(),
  objective: z.string().min(1),
  audience: z.string().min(1),
  mainIdea: z.string().min(1),
  evidenceSource: z.string().optional(),
  productStage: z.string().min(1),
  desiredReaderAction: z.string().min(1),
  tone: z.string().min(1),
  format: z.enum(['TEXT_ONLY', 'SINGLE_IMAGE', 'MULTI_IMAGE', 'LINK_POST', 'NATIVE_VIDEO_BRIEF', 'DOCUMENT_POST_BRIEF', 'POLL_BRIEF']).default('TEXT_ONLY'),
  maxLength: z.number().int().min(50).max(3000).default(1200),
  claimsRequiringVerification: z.array(z.string()).optional(),
  relevantLink: z.string().url().optional(),
  creativeAssetId: z.number().int().optional(),
  discussesPricing: z.boolean().default(false),
  discussesUsersOrOutcomes: z.boolean().default(false),
});

briefsRouter.post(
  '/',
  validate({ body: createSchema }),
  asyncHandler(async (req, res) => {
    const brief = await prisma.contentBrief.create({ data: { ...req.body, createdBy: req.adminUser!.id } });
    await writeAudit({ actorId: req.adminUser!.id, action: 'brief.create', entityType: 'ContentBrief', entityId: brief.id });
    res.status(201).json({ brief });
  }),
);

const generateSchema = z.object({ ideaId: z.number().int() });

briefsRouter.post(
  '/generate',
  validate({ body: generateSchema }),
  asyncHandler(async (req, res) => {
    const idea = await prisma.contentIdea.findUnique({ where: { id: req.body.ideaId }, include: { pillar: true } });
    if (!idea) throw notFound('Idea not found.');
    if (!idea.pillar) throw notFound('Idea has no pillar assigned; assign one before generating a brief.');

    const { result: seed, providerUsed, fellBackToTemplate } = await withProviderFallback((provider) =>
      provider.generateBrief({ pillarName: idea.pillar!.name, ideaTitle: idea.title, launch: getLaunchContext() }),
    );

    const VALID_FORMATS = ['TEXT_ONLY', 'SINGLE_IMAGE', 'MULTI_IMAGE', 'LINK_POST', 'NATIVE_VIDEO_BRIEF', 'DOCUMENT_POST_BRIEF', 'POLL_BRIEF'] as const;
    const format = (VALID_FORMATS as readonly string[]).includes(seed.format) ? (seed.format as (typeof VALID_FORMATS)[number]) : 'TEXT_ONLY';

    const brief = await prisma.contentBrief.create({
      data: { ...seed, format, ideaId: idea.id, pillarId: idea.pillarId, createdBy: req.adminUser!.id },
    });
    await writeAudit({
      actorId: req.adminUser!.id,
      action: 'brief.generate',
      entityType: 'ContentBrief',
      entityId: brief.id,
      metadata: { providerUsed, fellBackToTemplate },
    });
    res.status(201).json({ brief, providerUsed, fellBackToTemplate });
  }),
);

const updateSchema = createSchema.partial();

briefsRouter.patch(
  '/:id',
  validate({ body: updateSchema, params: z.object({ id: z.coerce.number().int() }) }),
  asyncHandler(async (req, res) => {
    const brief = await prisma.contentBrief.update({ where: { id: Number(req.params.id) }, data: req.body });
    await writeAudit({ actorId: req.adminUser!.id, action: 'brief.update', entityType: 'ContentBrief', entityId: brief.id, metadata: req.body });
    res.json({ brief });
  }),
);
