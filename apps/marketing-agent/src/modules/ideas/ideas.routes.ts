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

export const ideasRouter = Router();
ideasRouter.use(requireAuth);

ideasRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const pillarId = req.query.pillarId ? Number(req.query.pillarId) : undefined;
    const ideas = await prisma.contentIdea.findMany({
      where: { pillarId },
      orderBy: { createdAt: 'desc' },
      include: { pillar: true, campaign: true },
    });
    res.json({ ideas });
  }),
);

const createSchema = z.object({
  title: z.string().min(1),
  notes: z.string().optional(),
  pillarId: z.number().int().optional(),
  campaignId: z.number().int().optional(),
});

ideasRouter.post(
  '/',
  validate({ body: createSchema }),
  asyncHandler(async (req, res) => {
    const idea = await prisma.contentIdea.create({ data: { ...req.body, createdBy: req.adminUser!.id } });
    await writeAudit({ actorId: req.adminUser!.id, action: 'idea.create', entityType: 'ContentIdea', entityId: idea.id });
    res.status(201).json({ idea });
  }),
);

const generateSchema = z.object({ pillarId: z.number().int(), count: z.number().int().min(1).max(10).default(3) });

// Uses the configured ContentGenerationProvider (falls back to template mode
// on failure) to seed idea candidates for a pillar. Ideas are a planning
// aid, not published content — nothing here is auto-approved or scheduled.
ideasRouter.post(
  '/generate',
  validate({ body: generateSchema }),
  asyncHandler(async (req, res) => {
    const pillar = await prisma.contentPillar.findUnique({ where: { id: req.body.pillarId } });
    if (!pillar) throw notFound('Pillar not found.');

    const { result: seeds, providerUsed, fellBackToTemplate } = await withProviderFallback((provider) =>
      provider.generateIdeas({ pillarName: pillar.name, count: req.body.count, launch: getLaunchContext() }),
    );

    const ideas = await prisma.$transaction(
      seeds.map((seed) =>
        prisma.contentIdea.create({
          data: { title: seed.title, notes: seed.notes, pillarId: pillar.id, createdBy: req.adminUser!.id },
        }),
      ),
    );
    await writeAudit({
      actorId: req.adminUser!.id,
      action: 'idea.generate',
      entityType: 'ContentPillar',
      entityId: pillar.id,
      metadata: { count: ideas.length, providerUsed, fellBackToTemplate },
    });
    res.status(201).json({ ideas, providerUsed, fellBackToTemplate });
  }),
);
