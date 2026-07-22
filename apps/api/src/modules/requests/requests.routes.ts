import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../lib/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';
import { paginate, pageMeta } from '../../lib/pagination.js';
import { badRequest, forbidden, notFound } from '../../lib/errors.js';
import { money, publicUser } from '../../lib/serializers.js';
import { createRequestSchema, updateRequestSchema, feedQuerySchema } from './requests.schemas.js';

export const requestsRouter = Router();

async function approvedTutorProfile(userId: number) {
  return prisma.tutorProfile.findFirst({ where: { userId, status: 'APPROVED' } });
}

function serializeRequestCore(r: {
  id: number;
  title: string;
  description: string;
  deliveryMode: string;
  country: string | null;
  city: string | null;
  locationNote: string | null;
  budgetMinCents: number | null;
  budgetMaxCents: number | null;
  currency: string;
  timing: string | null;
  status: string;
  createdAt: Date;
  publishedAt: Date | null;
  subject: { id: number; name: string };
  level: { id: number; name: string } | null;
}) {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    deliveryMode: r.deliveryMode,
    country: r.country,
    city: r.city,
    locationNote: r.locationNote,
    budgetMin: money(r.budgetMinCents, r.currency),
    budgetMax: money(r.budgetMaxCents, r.currency),
    currency: r.currency,
    timing: r.timing,
    status: r.status,
    createdAt: r.createdAt,
    publishedAt: r.publishedAt,
    subject: r.subject,
    level: r.level,
  };
}

// --- Tutor request feed (must precede "/:id") ------------------------------

requestsRouter.get(
  '/feed',
  requireAuth,
  validate({ query: feedQuerySchema }),
  asyncHandler(async (req, res) => {
    const profile = await approvedTutorProfile(req.user!.id);
    if (!profile) throw forbidden('Only approved tutors can view the request feed.');
    const qp = req.query as unknown as import('zod').infer<typeof feedQuerySchema>;

    // Relevant = matches one of the tutor's subjects (unless a subject filter
    // narrows it further).
    const mySubjectIds = (
      await prisma.tutorSubject.findMany({ where: { tutorProfileId: profile.id }, select: { subjectId: true } })
    ).map((s) => s.subjectId);

    const where: Prisma.TutoringRequestWhereInput = {
      status: 'OPEN',
      hiddenAt: null,
      subjectId: qp.subjectId ? qp.subjectId : { in: mySubjectIds.length ? mySubjectIds : [-1] },
    };
    if (qp.levelId) where.levelId = qp.levelId;
    if (qp.mode === 'online') where.deliveryMode = { in: ['ONLINE', 'BOTH'] };
    if (qp.mode === 'in_person') where.deliveryMode = { in: ['IN_PERSON', 'BOTH'] };

    const [total, rows] = await Promise.all([
      prisma.tutoringRequest.count({ where }),
      prisma.tutoringRequest.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        ...paginate(qp.page, qp.pageSize),
        include: {
          subject: true,
          level: true,
          student: { select: { id: true, displayName: true, avatarKey: true } },
          responses: { where: { tutorProfileId: profile.id }, select: { id: true, status: true } },
        },
      }),
    ]);

    const results = rows.map((r) => ({
      ...serializeRequestCore(r),
      student: publicUser(r.student),
      // Tutor sees only whether *they* have already responded — never others.
      myResponse: r.responses[0] ?? null,
    }));
    res.json({ results, meta: pageMeta(total, qp.page, qp.pageSize) });
  }),
);

// --- Student's own requests ------------------------------------------------

requestsRouter.get(
  '/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const rows = await prisma.tutoringRequest.findMany({
      where: { studentId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: {
        subject: true,
        level: true,
        _count: { select: { responses: true } },
      },
    });
    res.json({
      requests: rows.map((r) => ({ ...serializeRequestCore(r), responseCount: r._count.responses })),
    });
  }),
);

requestsRouter.post(
  '/',
  requireAuth,
  validate({ body: createRequestSchema }),
  asyncHandler(async (req, res) => {
    const b = req.body as import('zod').infer<typeof createRequestSchema>;
    if (b.budgetMinCents != null && b.budgetMaxCents != null && b.budgetMinCents > b.budgetMaxCents) {
      throw badRequest('Minimum budget cannot exceed maximum budget.');
    }
    const subject = await prisma.subject.findUnique({ where: { id: b.subjectId } });
    if (!subject) throw badRequest('Invalid subject.');

    const created = await prisma.tutoringRequest.create({
      data: {
        studentId: req.user!.id,
        subjectId: b.subjectId,
        levelId: b.levelId ?? null,
        title: b.title,
        description: b.description,
        deliveryMode: b.deliveryMode,
        country: b.country,
        city: b.city,
        locationNote: b.locationNote,
        budgetMinCents: b.budgetMinCents ?? null,
        budgetMaxCents: b.budgetMaxCents ?? null,
        currency: b.currency,
        timing: b.timing,
        status: b.publish ? 'OPEN' : 'DRAFT',
        publishedAt: b.publish ? new Date() : null,
      },
      include: { subject: true, level: true },
    });
    res.status(201).json({ request: serializeRequestCore(created) });
  }),
);

// --- Detail (role-aware) ---------------------------------------------------

requestsRouter.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const request = await prisma.tutoringRequest.findUnique({
      where: { id },
      include: {
        subject: true,
        level: true,
        student: { select: { id: true, displayName: true, avatarKey: true } },
        responses: {
          orderBy: { createdAt: 'desc' },
          include: {
            tutorProfile: {
              include: { user: { select: { id: true, displayName: true, avatarKey: true } } },
            },
          },
        },
      },
    });
    if (!request) throw notFound();

    const isOwner = request.studentId === req.user!.id;

    if (isOwner) {
      // Student sees every response, including proposed rates, to compare.
      res.json({
        request: serializeRequestCore(request),
        student: publicUser(request.student),
        isOwner: true,
        responses: request.responses.map((resp) => ({
          id: resp.id,
          status: resp.status,
          introduction: resp.introduction,
          proposedRate: money(resp.proposedRateCents, request.currency),
          availabilityNote: resp.availabilityNote,
          createdAt: resp.createdAt,
          tutor: {
            profileId: resp.tutorProfile.id,
            averageRating: resp.tutorProfile.averageRating,
            ratingCount: resp.tutorProfile.ratingCount,
            headline: resp.tutorProfile.headline,
            ...publicUser(resp.tutorProfile.user),
          },
        })),
      });
      return;
    }

    // Otherwise only approved tutors may view — and never competing rates.
    const profile = await approvedTutorProfile(req.user!.id);
    if (!profile || request.status !== 'OPEN' || request.hiddenAt) throw forbidden();
    const mine = request.responses.find((r) => r.tutorProfileId === profile.id) ?? null;
    res.json({
      request: serializeRequestCore(request),
      student: publicUser(request.student),
      isOwner: false,
      responseCount: request.responses.length,
      myResponse: mine
        ? {
            id: mine.id,
            status: mine.status,
            introduction: mine.introduction,
            proposedRate: money(mine.proposedRateCents, request.currency),
            availabilityNote: mine.availabilityNote,
          }
        : null,
    });
  }),
);

// --- Owner lifecycle -------------------------------------------------------

async function ownRequest(userId: number, id: number) {
  const r = await prisma.tutoringRequest.findUnique({ where: { id } });
  if (!r) throw notFound();
  if (r.studentId !== userId) throw forbidden();
  return r;
}

requestsRouter.patch(
  '/:id',
  requireAuth,
  validate({ body: updateRequestSchema }),
  asyncHandler(async (req, res) => {
    const existing = await ownRequest(req.user!.id, Number(req.params.id));
    if (existing.status === 'CLOSED') throw badRequest('A closed request cannot be edited.');
    const updated = await prisma.tutoringRequest.update({
      where: { id: existing.id },
      data: req.body,
      include: { subject: true, level: true },
    });
    res.json({ request: serializeRequestCore(updated) });
  }),
);

for (const [path, action] of [
  ['publish', 'OPEN'],
  ['pause', 'PAUSED'],
  ['close', 'CLOSED'],
] as const) {
  requestsRouter.post(
    `/:id/${path}`,
    requireAuth,
    asyncHandler(async (req, res) => {
      const existing = await ownRequest(req.user!.id, Number(req.params.id));
      const data: Prisma.TutoringRequestUpdateInput = { status: action };
      if (action === 'OPEN' && !existing.publishedAt) data.publishedAt = new Date();
      if (action === 'CLOSED') data.closedAt = new Date();
      const updated = await prisma.tutoringRequest.update({
        where: { id: existing.id },
        data,
        include: { subject: true, level: true },
      });
      res.json({ request: serializeRequestCore(updated) });
    }),
  );
}
