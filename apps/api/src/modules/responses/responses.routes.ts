import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../lib/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';
import { badRequest, forbidden, notFound } from '../../lib/errors.js';
import { notify } from '../../lib/notify.js';
import { writeAudit } from '../../lib/audit.js';
import { getOrCreateConversation, postMessage } from '../conversations/conversations.service.js';

export const responsesRouter = Router();

const createSchema = z.object({
  requestId: z.number().int().positive(),
  introduction: z.string().min(10).max(3000),
  proposedRateCents: z.number().int().min(0).max(100000000).nullable().optional(),
  availabilityNote: z.string().max(1000).optional(),
});
const editSchema = z.object({
  introduction: z.string().min(10).max(3000).optional(),
  proposedRateCents: z.number().int().min(0).max(100000000).nullable().optional(),
  availabilityNote: z.string().max(1000).optional(),
});

async function approvedProfile(userId: number) {
  const p = await prisma.tutorProfile.findFirst({ where: { userId, status: 'APPROVED' } });
  if (!p) throw forbidden('Only approved tutors can respond to requests.');
  return p;
}

// --- Tutor: submit a response ----------------------------------------------

responsesRouter.post(
  '/',
  requireAuth,
  validate({ body: createSchema }),
  asyncHandler(async (req, res) => {
    const profile = await approvedProfile(req.user!.id);
    const request = await prisma.tutoringRequest.findUnique({ where: { id: req.body.requestId } });
    if (!request || request.status !== 'OPEN' || request.hiddenAt) throw badRequest('This request is not open.');
    if (request.studentId === req.user!.id) throw badRequest('You cannot respond to your own request.');

    const existing = await prisma.requestResponse.findUnique({
      where: { requestId_tutorProfileId: { requestId: request.id, tutorProfileId: profile.id } },
    });
    if (existing && existing.status !== 'WITHDRAWN') {
      throw badRequest('You already have an active response to this request. Edit it instead.');
    }

    const data = {
      introduction: req.body.introduction,
      proposedRateCents: req.body.proposedRateCents ?? null,
      availabilityNote: req.body.availabilityNote,
      status: 'PENDING' as const,
    };
    const response = existing
      ? await prisma.requestResponse.update({ where: { id: existing.id }, data })
      : await prisma.requestResponse.create({
          data: { requestId: request.id, tutorProfileId: profile.id, ...data },
        });

    await notify({
      userId: request.studentId,
      type: 'response',
      title: 'A tutor responded to your request',
      body: request.title,
      linkUrl: `/requests/${request.id}`,
    });
    res.status(201).json({ responseId: response.id });
  }),
);

// --- Tutor: edit / withdraw ------------------------------------------------

async function ownResponse(userId: number, id: number) {
  const r = await prisma.requestResponse.findUnique({
    where: { id },
    include: { tutorProfile: { select: { userId: true } }, request: true },
  });
  if (!r) throw notFound();
  if (r.tutorProfile.userId !== userId) throw forbidden();
  return r;
}

responsesRouter.patch(
  '/:id',
  requireAuth,
  validate({ body: editSchema }),
  asyncHandler(async (req, res) => {
    const r = await ownResponse(req.user!.id, Number(req.params.id));
    if (r.status !== 'PENDING') throw badRequest('Only a pending response can be edited.');
    await prisma.requestResponse.update({ where: { id: r.id }, data: req.body });
    res.json({ ok: true });
  }),
);

responsesRouter.post(
  '/:id/withdraw',
  requireAuth,
  asyncHandler(async (req, res) => {
    const r = await ownResponse(req.user!.id, Number(req.params.id));
    if (r.status === 'ACCEPTED') throw badRequest('An accepted response cannot be withdrawn.');
    await prisma.requestResponse.update({ where: { id: r.id }, data: { status: 'WITHDRAWN' } });
    res.json({ ok: true });
  }),
);

// --- Student: accept / decline ---------------------------------------------

async function responseOnMyRequest(userId: number, id: number) {
  const r = await prisma.requestResponse.findUnique({
    where: { id },
    include: {
      request: true,
      tutorProfile: { include: { user: { select: { id: true, displayName: true } } } },
    },
  });
  if (!r) throw notFound();
  if (r.request.studentId !== userId) throw forbidden();
  return r;
}

responsesRouter.post(
  '/:id/accept',
  requireAuth,
  asyncHandler(async (req, res) => {
    const r = await responseOnMyRequest(req.user!.id, Number(req.params.id));
    if (r.status !== 'PENDING') throw badRequest('This response can no longer be accepted.');

    const conversation = await getOrCreateConversation({
      studentId: req.user!.id,
      tutorUserId: r.tutorProfile.userId,
      tutorProfileId: r.tutorProfileId,
      context: 'REQUEST_RESPONSE',
      requestId: r.requestId,
    });

    const engagement = await prisma.$transaction(async (tx) => {
      await tx.requestResponse.update({ where: { id: r.id }, data: { status: 'ACCEPTED' } });
      return tx.engagement.create({
        data: {
          studentId: req.user!.id,
          tutorProfileId: r.tutorProfileId,
          subjectId: r.request.subjectId,
          requestId: r.requestId,
          conversationId: conversation.id,
          title: r.request.title,
          status: 'ARRANGED',
        },
      });
    });

    await postMessage({
      conversationId: conversation.id,
      senderId: req.user!.id,
      body: `Hi ${r.tutorProfile.user.displayName}, I'd like to go ahead with your response to "${r.request.title}".`,
    });
    await notify({
      userId: r.tutorProfile.userId,
      type: 'response_accepted',
      title: 'Your response was accepted',
      body: r.request.title,
      linkUrl: `/messages/${conversation.id}`,
    });
    await writeAudit({ actorId: req.user!.id, action: 'response.accepted', entityType: 'RequestResponse', entityId: r.id });

    res.json({ conversationId: conversation.id, engagementId: engagement.id });
  }),
);

responsesRouter.post(
  '/:id/decline',
  requireAuth,
  asyncHandler(async (req, res) => {
    const r = await responseOnMyRequest(req.user!.id, Number(req.params.id));
    if (r.status !== 'PENDING') throw badRequest('This response can no longer be declined.');
    await prisma.requestResponse.update({ where: { id: r.id }, data: { status: 'DECLINED' } });
    await notify({
      userId: r.tutorProfile.userId,
      type: 'response_declined',
      title: 'A response was declined',
      body: r.request.title,
    });
    res.json({ ok: true });
  }),
);
