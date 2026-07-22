import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { prisma } from '../../lib/prisma.js';

export const taxonomyRouter = Router();

taxonomyRouter.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { subjects: { orderBy: { name: 'asc' } } },
    });
    res.json({ categories });
  }),
);

taxonomyRouter.get(
  '/subjects',
  asyncHandler(async (_req, res) => {
    const subjects = await prisma.subject.findMany({
      orderBy: { name: 'asc' },
      include: { category: true },
    });
    res.json({ subjects });
  }),
);

taxonomyRouter.get(
  '/levels',
  asyncHandler(async (_req, res) => {
    const levels = await prisma.teachingLevel.findMany({ orderBy: { sortOrder: 'asc' } });
    res.json({ levels });
  }),
);
