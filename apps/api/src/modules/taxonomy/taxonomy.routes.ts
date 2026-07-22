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

// Catalogue overview for the home page: categories with their subjects and the
// number of approved tutors offering each (marketplace-style browse tiles).
taxonomyRouter.get(
  '/overview',
  asyncHandler(async (_req, res) => {
    const [categories, grouped, totalApprovedTutors] = await Promise.all([
      prisma.category.findMany({
        orderBy: { name: 'asc' },
        include: { subjects: { orderBy: { name: 'asc' }, select: { id: true, name: true, slug: true } } },
      }),
      prisma.tutorSubject.groupBy({
        by: ['subjectId'],
        where: { tutorProfile: { status: 'APPROVED' } },
        _count: { tutorProfileId: true },
      }),
      prisma.tutorProfile.count({ where: { status: 'APPROVED' } }),
    ]);

    const countBySubject = new Map(grouped.map((g) => [g.subjectId, g._count.tutorProfileId]));

    const result = categories.map((c) => {
      const subjects = c.subjects.map((s) => ({ ...s, tutorCount: countBySubject.get(s.id) ?? 0 }));
      return {
        id: c.id,
        name: c.name,
        icon: c.icon,
        subjectCount: subjects.length,
        tutorCount: subjects.reduce((n, s) => n + s.tutorCount, 0),
        subjects,
      };
    });

    const totalSubjects = categories.reduce((n, c) => n + c.subjects.length, 0);
    res.json({ categories: result, totalSubjects, totalApprovedTutors });
  }),
);
