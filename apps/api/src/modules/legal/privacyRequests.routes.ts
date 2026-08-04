import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../lib/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../lib/errors.js';

export const privacyRequestsRouter = Router();

const REQUEST_TYPES = [
  'ACCESS',
  'CORRECTION',
  'EXPORT',
  'DEACTIVATION',
  'DELETION',
  'MARKETING_OPT_OUT',
  'CONSENT_WITHDRAWAL',
  'COMPLAINT',
  'AUTOMATED_DECISION_ENQUIRY',
] as const;

const submitSchema = z.object({
  type: z.enum(REQUEST_TYPES),
  contactEmail: z.string().email().max(200),
  details: z.string().min(10).max(4000),
});

/**
 * Submission is deliberately open to people who are not signed in.
 *
 * Someone whose account was closed, or who never had one but appears in
 * another user's content, still has the right to ask what is held about them.
 * Requiring a login here would block exactly the people most likely to need
 * it. Identity is verified during handling, proportionately to the request --
 * that check is recorded in `identityCheckNote`, not enforced at the door.
 */
privacyRequestsRouter.post(
  '/',
  validate({ body: submitSchema }),
  asyncHandler(async (req, res) => {
    const b = req.body as z.infer<typeof submitSchema>;

    const created = await prisma.privacyRequest.create({
      data: {
        userId: req.user?.id ?? null,
        contactEmail: b.contactEmail,
        type: b.type,
        details: b.details,
        events: {
          create: {
            actorId: req.user?.id ?? null,
            action: 'RECEIVED',
            note: req.user ? 'Submitted by signed-in user.' : 'Submitted by an unauthenticated visitor.',
          },
        },
      },
    });

    res.status(201).json({
      request: { id: created.id, type: created.type, status: created.status, createdAt: created.createdAt },
      // No promised turnaround time is returned here. Statutory response
      // periods differ by jurisdiction and inventing one would be a
      // commitment the founder has not agreed to.
      message:
        'Your request has been recorded. We will contact you at the email address you gave, and may '
        + 'need to verify your identity before we can act on it.',
    });
  }),
);

/** A signed-in user's own requests. */
privacyRequestsRouter.get(
  '/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const rows = await prisma.privacyRequest.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: { events: { orderBy: { createdAt: 'asc' } } },
    });

    res.json({
      requests: rows.map((r) => ({
        id: r.id,
        type: r.type,
        status: r.status,
        details: r.details,
        outcomeNote: r.outcomeNote,
        refusalReason: r.refusalReason,
        createdAt: r.createdAt,
        closedAt: r.closedAt,
        events: r.events.map((e) => ({ action: e.action, note: e.note, createdAt: e.createdAt })),
      })),
    });
  }),
);

// --- Administration -------------------------------------------------------

privacyRequestsRouter.get(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (_req, res) => {
    const rows = await prisma.privacyRequest.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      include: { events: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    res.json({ requests: rows });
  }),
);

const updateSchema = z.object({
  status: z
    .enum(['RECEIVED', 'IDENTITY_CHECK', 'IN_PROGRESS', 'AWAITING_USER', 'COMPLETED', 'REFUSED', 'WITHDRAWN'])
    .optional(),
  identityCheckNote: z.string().max(2000).optional(),
  outcomeNote: z.string().max(4000).optional(),
  refusalReason: z.string().max(2000).optional(),
  note: z.string().max(2000).optional(),
});

privacyRequestsRouter.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ body: updateSchema }),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.privacyRequest.findUnique({ where: { id } });
    if (!existing) throw notFound();

    const b = req.body as z.infer<typeof updateSchema>;
    const closing = b.status === 'COMPLETED' || b.status === 'REFUSED' || b.status === 'WITHDRAWN';

    const updated = await prisma.privacyRequest.update({
      where: { id },
      data: {
        status: b.status ?? existing.status,
        identityCheckNote: b.identityCheckNote ?? existing.identityCheckNote,
        outcomeNote: b.outcomeNote ?? existing.outcomeNote,
        refusalReason: b.refusalReason ?? existing.refusalReason,
        handledBy: req.user!.id,
        closedAt: closing ? existing.closedAt ?? new Date() : existing.closedAt,
        events: {
          create: {
            actorId: req.user!.id,
            action: b.status ? `STATUS_${b.status}` : 'UPDATED',
            note: b.note ?? null,
          },
        },
      },
      include: { events: { orderBy: { createdAt: 'asc' } } },
    });

    res.json({ request: updated });
  }),
);
