import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../lib/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';
import { badRequest } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';

export const reportsRouter = Router();

const createSchema = z.object({
  entityType: z.enum(['TUTOR_PROFILE', 'REQUEST', 'MESSAGE', 'REVIEW', 'USER']),
  entityId: z.number().int().positive(),
  reason: z.string().min(3).max(200),
  details: z.string().max(2000).optional(),
});

async function entityExists(type: string, id: number): Promise<boolean> {
  switch (type) {
    case 'TUTOR_PROFILE':
      return !!(await prisma.tutorProfile.findUnique({ where: { id }, select: { id: true } }));
    case 'REQUEST':
      return !!(await prisma.tutoringRequest.findUnique({ where: { id }, select: { id: true } }));
    case 'MESSAGE':
      return !!(await prisma.message.findUnique({ where: { id }, select: { id: true } }));
    case 'REVIEW':
      return !!(await prisma.review.findUnique({ where: { id }, select: { id: true } }));
    case 'USER':
      return !!(await prisma.user.findUnique({ where: { id }, select: { id: true } }));
    default:
      return false;
  }
}

reportsRouter.post(
  '/',
  requireAuth,
  validate({ body: createSchema }),
  asyncHandler(async (req, res) => {
    const { entityType, entityId, reason, details } = req.body;
    if (!(await entityExists(entityType, entityId))) throw badRequest('That item no longer exists.');

    // Collapse repeat reports from the same user on the same open item.
    const existing = await prisma.report.findFirst({
      where: { reporterId: req.user!.id, entityType, entityId, status: { in: ['OPEN', 'INVESTIGATING'] } },
    });
    if (existing) {
      res.status(200).json({ reportId: existing.id, alreadyReported: true });
      return;
    }

    const report = await prisma.report.create({
      data: { reporterId: req.user!.id, entityType, entityId, reason, details },
    });
    await writeAudit({ actorId: req.user!.id, action: 'report.created', entityType, entityId });
    res.status(201).json({ reportId: report.id });
  }),
);
