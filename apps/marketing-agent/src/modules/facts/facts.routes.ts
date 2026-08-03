import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../lib/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';

export const factsRouter = Router();
factsRouter.use(requireAuth);

// Fields exactly per spec §13.
factsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const facts = await prisma.marketingFact.findMany({ orderBy: { factKey: 'asc' }, include: { sources: true } });
    res.json({ facts });
  }),
);

const createSchema = z.object({
  factKey: z.string().min(1),
  value: z.string().min(1),
  source: z.string().min(1),
  approvedBy: z.string().min(1),
  approvalDate: z.coerce.date(),
  validFrom: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
  isPublic: z.boolean().default(true),
  containsPersonalInfo: z.boolean().default(false),
});

factsRouter.post(
  '/',
  validate({ body: createSchema }),
  asyncHandler(async (req, res) => {
    const fact = await prisma.marketingFact.create({ data: req.body });
    await writeAudit({ actorId: req.adminUser!.id, action: 'fact.approve', entityType: 'MarketingFact', entityId: fact.id, metadata: { factKey: fact.factKey } });
    res.status(201).json({ fact });
  }),
);

const updateSchema = createSchema.partial();

factsRouter.patch(
  '/:id',
  validate({ body: updateSchema, params: z.object({ id: z.coerce.number().int() }) }),
  asyncHandler(async (req, res) => {
    const fact = await prisma.marketingFact.update({ where: { id: Number(req.params.id) }, data: req.body });
    await writeAudit({ actorId: req.adminUser!.id, action: 'fact.update', entityType: 'MarketingFact', entityId: fact.id, metadata: req.body });
    res.json({ fact });
  }),
);

// "Delete" retires a fact (expiresAt = now) rather than destroying its
// history — the audit trail of what SkillSplore was once allowed to claim,
// and when that stopped being true, is itself worth keeping.
factsRouter.delete(
  '/:id',
  validate({ params: z.object({ id: z.coerce.number().int() }) }),
  asyncHandler(async (req, res) => {
    const existing = await prisma.marketingFact.findUnique({ where: { id: Number(req.params.id) } });
    if (!existing) throw notFound();
    const fact = await prisma.marketingFact.update({ where: { id: existing.id }, data: { expiresAt: new Date() } });
    await writeAudit({ actorId: req.adminUser!.id, action: 'fact.retire', entityType: 'MarketingFact', entityId: fact.id });
    res.json({ fact });
  }),
);
