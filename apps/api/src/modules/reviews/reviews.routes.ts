import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../lib/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors.js';
import { notify } from '../../lib/notify.js';
import { recomputeTutorRating } from './reviews.service.js';

export const reviewsRouter = Router();

const createSchema = z.object({
  engagementId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(140).optional(),
  body: z.string().min(4).max(3000),
  categoryRatings: z
    .object({
      communication: z.number().int().min(1).max(5).optional(),
      knowledge: z.number().int().min(1).max(5).optional(),
      punctuality: z.number().int().min(1).max(5).optional(),
      helpfulness: z.number().int().min(1).max(5).optional(),
    })
    .optional(),
});

const responseSchema = z.object({ response: z.string().min(2).max(1500) });

// Student submits a review. Guaranteed to relate to a real, completed
// engagement (prevents unrelated reviews) and one-per-engagement (prevents
// duplicates) via the DB unique constraint on Review.engagementId.
reviewsRouter.post(
  '/',
  requireAuth,
  validate({ body: createSchema }),
  asyncHandler(async (req, res) => {
    const engagement = await prisma.engagement.findUnique({
      where: { id: req.body.engagementId },
      include: { review: true },
    });
    if (!engagement) throw notFound('Engagement not found.');
    if (engagement.studentId !== req.user!.id) throw forbidden('You can only review your own engagements.');
    if (engagement.status !== 'COMPLETED') throw badRequest('You can review only completed engagements.');
    if (engagement.review) throw conflict('You have already reviewed this engagement.');

    const review = await prisma.review.create({
      data: {
        engagementId: engagement.id,
        tutorProfileId: engagement.tutorProfileId,
        studentId: req.user!.id,
        rating: req.body.rating,
        title: req.body.title,
        body: req.body.body,
        categoryRatings: req.body.categoryRatings,
      },
    });
    await recomputeTutorRating(engagement.tutorProfileId);

    const profile = await prisma.tutorProfile.findUnique({
      where: { id: engagement.tutorProfileId },
      select: { userId: true },
    });
    if (profile) {
      await notify({
        userId: profile.userId,
        type: 'review',
        title: 'You received a new review',
        body: `${req.body.rating}★ — ${req.body.title ?? ''}`.trim(),
      });
    }
    res.status(201).json({ reviewId: review.id });
  }),
);

// Tutor posts a single public response to a review on their own profile.
reviewsRouter.post(
  '/:id/response',
  requireAuth,
  validate({ body: responseSchema }),
  asyncHandler(async (req, res) => {
    const review = await prisma.review.findUnique({
      where: { id: Number(req.params.id) },
      include: { tutorProfile: { select: { userId: true } } },
    });
    if (!review) throw notFound();
    if (review.tutorProfile.userId !== req.user!.id) throw forbidden();
    await prisma.review.update({
      where: { id: review.id },
      data: { tutorResponse: req.body.response, tutorRespondedAt: new Date() },
    });
    res.json({ ok: true });
  }),
);

// Reviews the signed-in student has written.
reviewsRouter.get(
  '/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const reviews = await prisma.review.findMany({
      where: { studentId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: { tutorProfile: { include: { user: { select: { id: true, displayName: true } } } } },
    });
    res.json({
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        body: r.body,
        status: r.status,
        createdAt: r.createdAt,
        tutor: { profileId: r.tutorProfileId, displayName: r.tutorProfile.user.displayName },
      })),
    });
  }),
);
