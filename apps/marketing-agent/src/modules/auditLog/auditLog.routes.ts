import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';

export const auditLogRouter = Router();
auditLogRouter.use(requireAuth);

auditLogRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const take = Math.min(Number(req.query.take) || 50, 200);
    const entityType = req.query.entityType as string | undefined;
    const logs = await prisma.auditLog.findMany({
      where: entityType ? { entityType } : undefined,
      orderBy: { createdAt: 'desc' },
      take,
    });
    res.json({ logs });
  }),
);
