import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../lib/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';
import { writeAudit } from '../../lib/audit.js';

export const pillarsRouter = Router();
pillarsRouter.use(requireAuth);

// §9 — the six content pillars and their suggested distribution.
pillarsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const pillars = await prisma.contentPillar.findMany({ orderBy: { id: 'asc' } });
    res.json({ pillars });
  }),
);

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  targetPercentage: z.number().int().min(0).max(100).optional(),
  active: z.boolean().optional(),
});

pillarsRouter.patch(
  '/:id',
  validate({ body: updateSchema, params: z.object({ id: z.coerce.number().int() }) }),
  asyncHandler(async (req, res) => {
    const pillar = await prisma.contentPillar.update({
      where: { id: Number(req.params.id) },
      data: req.body,
    });
    await writeAudit({ actorId: req.adminUser!.id, action: 'pillar.update', entityType: 'ContentPillar', entityId: pillar.id, metadata: req.body });
    res.json({ pillar });
  }),
);
