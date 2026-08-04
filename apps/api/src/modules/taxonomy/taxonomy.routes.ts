import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../lib/validate.js';
import { prisma } from '../../lib/prisma.js';
import { normalizeName } from '../../lib/normalize.js';

export const taxonomyRouter = Router();

taxonomyRouter.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      include: { subjects: { where: { isActive: true }, orderBy: { name: 'asc' } } },
    });
    res.json({ categories });
  }),
);

taxonomyRouter.get(
  '/subjects',
  asyncHandler(async (_req, res) => {
    const subjects = await prisma.subject.findMany({
      where: { isActive: true },
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
//
// The catalogue is far too large to put on the homepage in full (see
// taxonomy.data.ts -- dozens of categories), so this only ever returns the
// ones marked `isFeatured`. The full catalogue is reached through
// /categories, used by search and the browse page.
taxonomyRouter.get(
  '/overview',
  asyncHandler(async (_req, res) => {
    const [categories, grouped, totalApprovedTutors, totalCategories, totalActiveSubjects] = await Promise.all([
      prisma.category.findMany({
        where: { isFeatured: true, isActive: true },
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        include: {
          subjects: { where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, slug: true } },
        },
      }),
      prisma.tutorSubject.groupBy({
        by: ['subjectId'],
        where: { tutorProfile: { status: 'APPROVED' } },
        _count: { tutorProfileId: true },
      }),
      prisma.tutorProfile.count({ where: { status: 'APPROVED' } }),
      prisma.category.count({ where: { isActive: true } }),
      prisma.subject.count({ where: { isActive: true } }),
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

    res.json({
      categories: result,
      // Kept for backward compatibility with anything reading the old shape --
      // it used to mean "subjects across the categories returned here"; now
      // that this endpoint returns only the featured slice, that name would be
      // misleading, so it reports the whole catalogue instead.
      totalSubjects: totalActiveSubjects,
      totalApprovedTutors,
      totalCategories,
      totalActiveSubjects,
    });
  }),
);

const suggestSchema = z.object({ q: z.string().min(1).max(120) });

// Typeahead for subject pickers: matches on name and on the alias table, so
// "maths" finds Mathematics and "coding" finds Programming even though
// neither word appears in the catalogue. Category matches are included too --
// searching "cybersecurity" should surface the whole category, not require
// picking a specific subject inside it first.
taxonomyRouter.get(
  '/suggest',
  validate({ query: suggestSchema }),
  asyncHandler(async (req, res) => {
    const q = (req.query as unknown as z.infer<typeof suggestSchema>).q.trim();
    const normalized = normalizeName(q);

    const [subjectsByName, categoriesByName, alias] = await Promise.all([
      prisma.subject.findMany({
        where: { isActive: true, name: { contains: q, mode: 'insensitive' } },
        orderBy: { name: 'asc' },
        take: 10,
        select: { id: true, name: true, categoryId: true, category: { select: { name: true, icon: true } } },
      }),
      prisma.category.findMany({
        where: { isActive: true, name: { contains: q, mode: 'insensitive' } },
        orderBy: { name: 'asc' },
        take: 5,
        select: { id: true, name: true, icon: true },
      }),
      prisma.taxonomyAlias.findUnique({
        where: { normalizedTerm: normalized },
        include: {
          subject: { select: { id: true, name: true, categoryId: true, category: { select: { name: true, icon: true } } } },
          category: { select: { id: true, name: true, icon: true } },
        },
      }),
    ]);

    const subjectIds = new Set(subjectsByName.map((s) => s.id));
    const subjects = subjectsByName.map((s) => ({
      id: s.id, name: s.name, categoryId: s.categoryId, categoryName: s.category?.name ?? null, icon: s.category?.icon ?? null,
    }));
    if (alias?.subject && !subjectIds.has(alias.subject.id)) {
      subjects.unshift({
        id: alias.subject.id, name: alias.subject.name, categoryId: alias.subject.categoryId,
        categoryName: alias.subject.category?.name ?? null, icon: alias.subject.category?.icon ?? null,
      });
    }

    const categoryIds = new Set(categoriesByName.map((c) => c.id));
    const categories = categoriesByName.map((c) => ({ id: c.id, name: c.name, icon: c.icon }));
    if (alias?.category && !categoryIds.has(alias.category.id)) {
      categories.unshift({ id: alias.category.id, name: alias.category.name, icon: alias.category.icon });
    }

    res.json({ subjects, categories });
  }),
);
