import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../lib/validate.js';
import { prisma } from '../../lib/prisma.js';
import { paginate, pageMeta } from '../../lib/pagination.js';
import { money, publicUser } from '../../lib/serializers.js';
import { activeVerifications } from '../../lib/verification.js';

export const searchRouter = Router();

const searchSchema = z.object({
  q: z.string().max(120).optional(),
  subjectId: z.coerce.number().int().positive().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  levelId: z.coerce.number().int().positive().optional(),
  country: z.string().max(80).optional(),
  city: z.string().max(120).optional(),
  mode: z.enum(['online', 'in_person']).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  availableOnly: z
    .string()
    .optional()
    .transform((v) => v === '1' || v === 'true'),
  sort: z.enum(['relevance', 'rating', 'price_asc', 'price_desc', 'newest']).default('relevance'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});

// Real database-backed tutor search. Only APPROVED profiles are ever returned.
searchRouter.get(
  '/',
  validate({ query: searchSchema }),
  asyncHandler(async (req, res) => {
    const qp = req.query as unknown as z.infer<typeof searchSchema>;

    const where: Prisma.TutorProfileWhereInput = { status: 'APPROVED' };
    const and: Prisma.TutorProfileWhereInput[] = [];

    if (qp.subjectId) and.push({ subjects: { some: { subjectId: qp.subjectId } } });
    if (qp.categoryId) and.push({ subjects: { some: { subject: { categoryId: qp.categoryId } } } });
    if (qp.levelId) and.push({ levels: { some: { id: qp.levelId } } });
    if (qp.country) and.push({ country: { contains: qp.country, mode: 'insensitive' } });
    if (qp.city) and.push({ city: { contains: qp.city, mode: 'insensitive' } });
    if (qp.mode === 'online') and.push({ deliveryMode: { in: ['ONLINE', 'BOTH'] } });
    if (qp.mode === 'in_person') and.push({ deliveryMode: { in: ['IN_PERSON', 'BOTH'] } });
    if (qp.availableOnly) and.push({ availability: { some: {} } });
    if (qp.minPrice != null) and.push({ hourlyRateCents: { gte: qp.minPrice } });
    if (qp.maxPrice != null) and.push({ hourlyRateCents: { lte: qp.maxPrice } });

    if (qp.q) {
      const q = qp.q.trim();
      and.push({
        OR: [
          { headline: { contains: q, mode: 'insensitive' } },
          { experience: { contains: q, mode: 'insensitive' } },
          { teachingStyle: { contains: q, mode: 'insensitive' } },
          { user: { displayName: { contains: q, mode: 'insensitive' } } },
          { subjects: { some: { subject: { name: { contains: q, mode: 'insensitive' } } } } },
        ],
      });
    }
    if (and.length) where.AND = and;

    const orderBy: Prisma.TutorProfileOrderByWithRelationInput[] =
      qp.sort === 'rating'
        ? [{ averageRating: 'desc' }, { ratingCount: 'desc' }]
        : qp.sort === 'price_asc'
          ? [{ hourlyRateCents: 'asc' }]
          : qp.sort === 'price_desc'
            ? [{ hourlyRateCents: 'desc' }]
            : qp.sort === 'newest'
              ? [{ approvedAt: 'desc' }]
              : [{ ratingCount: 'desc' }, { averageRating: 'desc' }];

    const [total, rows] = await Promise.all([
      prisma.tutorProfile.count({ where }),
      prisma.tutorProfile.findMany({
        where,
        orderBy,
        ...paginate(qp.page, qp.pageSize),
        include: {
          user: { select: { id: true, displayName: true, avatarKey: true } },
          subjects: { include: { subject: true } },
          qualifications: { select: { verifiedAt: true } },
          verifications: true,
        },
      }),
    ]);

    const results = rows.map((p) => ({
      id: p.id,
      userId: p.user.id,
      displayName: p.user.displayName,
      avatarUrl: publicUser(p.user).avatarUrl,
      headline: p.headline,
      country: p.country,
      city: p.city,
      deliveryMode: p.deliveryMode,
      hourlyRate: money(p.hourlyRateCents, p.currency),
      averageRating: p.averageRating,
      ratingCount: p.ratingCount,
      subjects: p.subjects.map((s) => s.subject.name),
      // Kept for backward compatibility with anything still reading a plain
      // boolean; `verifications` (named, specific checks) is the real signal.
      verified: p.qualifications.some((q) => q.verifiedAt),
      verifications: activeVerifications(p.verifications),
    }));

    res.json({ results, meta: pageMeta(total, qp.page, qp.pageSize) });
  }),
);
