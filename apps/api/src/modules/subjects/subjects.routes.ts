import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../lib/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';
import { normalizeName } from '../../lib/normalize.js';
import { notify } from '../../lib/notify.js';

export const subjectsRouter = Router();

// Fuzzy "did you mean" search backing the subject autocomplete in the tutor
// onboarding and request-creation subject pickers. This is the main defence
// against catalogue duplication: most of the time the user finds what they
// were about to re-create before they ever submit a suggestion.
subjectsRouter.get(
  '/search',
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (q.length < 2) return res.json({ subjects: [] });
    const subjects = await prisma.$queryRaw<Array<{ id: number; name: string; categoryName: string | null; similarity: number }>>`
      SELECT s.id, s.name, c.name as "categoryName", similarity(s.name, ${q}) as similarity
      FROM "Subject" s
      LEFT JOIN "Category" c ON c.id = s."categoryId"
      WHERE s.name ILIKE ${'%' + q + '%'} OR similarity(s.name, ${q}) > 0.2
      ORDER BY similarity DESC, s.name ASC
      LIMIT 8
    `;
    res.json({ subjects });
  }),
);

// Any authenticated user (student or tutor) can propose a subject that isn't
// in the catalogue. Never creates a Subject directly:
//  - exact match after normalization -> resolved instantly, no review needed
//  - an identical suggestion already pending -> return that one, don't duplicate it
//  - otherwise -> queued for admin review (see admin.routes.ts)
subjectsRouter.post(
  '/suggest',
  requireAuth,
  validate({
    body: z.object({
      name: z.string().min(2).max(80),
      suggestedCategoryId: z.number().int().positive().nullable().optional(),
      newCategoryName: z.string().max(80).optional(),
      note: z.string().max(300).optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const name = req.body.name.trim();
    const normalizedName = normalizeName(name);

    const existingSubject = await prisma.subject.findUnique({ where: { normalizedName } });
    if (existingSubject) {
      return res.json({ resolution: 'already_exists', subject: existingSubject });
    }

    const existingSuggestion = await prisma.subjectSuggestion.findFirst({
      where: { normalizedName, status: 'PENDING' },
    });
    if (existingSuggestion) {
      return res.json({ resolution: 'already_suggested', suggestion: existingSuggestion });
    }

    const suggestion = await prisma.subjectSuggestion.create({
      data: {
        name,
        normalizedName,
        suggestedCategoryId: req.body.suggestedCategoryId ?? null,
        newCategoryName: req.body.newCategoryName?.trim() || null,
        note: req.body.note?.trim() || null,
        submittedById: req.user!.id,
      },
    });

    // Notify admins so the queue doesn't go stale unnoticed.
    const admins = await prisma.user.findMany({ where: { roles: { has: 'ADMIN' } }, select: { id: true } });
    await Promise.all(
      admins.map((a) =>
        notify({
          userId: a.id,
          type: 'subject_suggestion_new',
          title: 'New subject suggestion',
          body: `Someone suggested adding "${name}" to the catalogue.`,
          linkUrl: '/admin/subject-suggestions',
        }),
      ),
    );

    res.status(201).json({ resolution: 'queued', suggestion });
  }),
);
