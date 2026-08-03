import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../lib/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';
import { writeAudit } from '../../lib/audit.js';

export const campaignsRouter = Router();
campaignsRouter.use(requireAuth);

campaignsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const campaigns = await prisma.contentCampaign.findMany({
      orderBy: { id: 'asc' },
      include: { _count: { select: { drafts: true, ideas: true } } },
    });
    res.json({ campaigns });
  }),
);

const createSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  goal: z.string().min(1),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

campaignsRouter.post(
  '/',
  validate({ body: createSchema }),
  asyncHandler(async (req, res) => {
    const campaign = await prisma.contentCampaign.create({ data: req.body });
    await writeAudit({ actorId: req.adminUser!.id, action: 'campaign.create', entityType: 'ContentCampaign', entityId: campaign.id });
    res.status(201).json({ campaign });
  }),
);

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  goal: z.string().min(1).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED']).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

campaignsRouter.patch(
  '/:id',
  validate({ body: updateSchema, params: z.object({ id: z.coerce.number().int() }) }),
  asyncHandler(async (req, res) => {
    const campaign = await prisma.contentCampaign.update({ where: { id: Number(req.params.id) }, data: req.body });
    await writeAudit({ actorId: req.adminUser!.id, action: 'campaign.update', entityType: 'ContentCampaign', entityId: campaign.id, metadata: req.body });
    res.json({ campaign });
  }),
);
