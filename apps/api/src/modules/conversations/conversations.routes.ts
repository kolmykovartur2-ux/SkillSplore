import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../lib/validate.js';
import { requireAuth, requireVerified } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';
import { badRequest, forbidden, notFound } from '../../lib/errors.js';
import { publicUser } from '../../lib/serializers.js';
import { getOrCreateConversation, postMessage, areBlocked } from './conversations.service.js';

export const conversationsRouter = Router();

const contactSchema = z.object({
  tutorProfileId: z.number().int().positive(),
  message: z.string().min(1).max(4000),
});
const messageSchema = z.object({ body: z.string().min(1).max(4000) });
const blockSchema = z.object({ userId: z.number().int().positive() });

async function unreadCountFor(conversationId: number, userId: number, lastReadAt: Date | null): Promise<number> {
  return prisma.message.count({
    where: {
      conversationId,
      senderId: { not: userId },
      hiddenAt: null,
      ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
    },
  });
}

// --- Direct enquiry --------------------------------------------------------

conversationsRouter.post(
  '/contact',
  requireAuth,
  requireVerified,
  validate({ body: contactSchema }),
  asyncHandler(async (req, res) => {
    const profile = await prisma.tutorProfile.findUnique({
      where: { id: req.body.tutorProfileId },
      include: { user: { select: { id: true } } },
    });
    if (!profile || profile.status !== 'APPROVED') throw notFound('Tutor not found.');
    if (profile.userId === req.user!.id) throw badRequest('You cannot contact yourself.');
    if (await areBlocked(req.user!.id, profile.userId)) throw forbidden('Messaging is unavailable.');

    const conversation = await getOrCreateConversation({
      studentId: req.user!.id,
      tutorUserId: profile.userId,
      tutorProfileId: profile.id,
      context: 'DIRECT_ENQUIRY',
    });
    await postMessage({ conversationId: conversation.id, senderId: req.user!.id, body: req.body.message });
    res.status(201).json({ conversationId: conversation.id });
  }),
);

// --- Conversation list -----------------------------------------------------

conversationsRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parts = await prisma.conversationParticipant.findMany({
      where: { userId: req.user!.id, archivedAt: null },
      include: {
        conversation: {
          include: {
            participants: { include: { user: { select: { id: true, displayName: true, avatarKey: true } } } },
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
      orderBy: { conversation: { lastMessageAt: 'desc' } },
    });

    const conversations = await Promise.all(
      parts.map(async (p) => {
        const other = p.conversation.participants.find((x) => x.userId !== req.user!.id);
        const last = p.conversation.messages[0];
        return {
          id: p.conversation.id,
          context: p.conversation.context,
          lastMessageAt: p.conversation.lastMessageAt,
          otherParticipant: other ? publicUser(other.user) : null,
          lastMessage: last ? { body: last.hiddenAt ? '[message removed]' : last.body, createdAt: last.createdAt } : null,
          unreadCount: await unreadCountFor(p.conversationId, req.user!.id, p.lastReadAt),
        };
      }),
    );
    res.json({ conversations });
  }),
);

conversationsRouter.get(
  '/unread-count',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parts = await prisma.conversationParticipant.findMany({
      where: { userId: req.user!.id, archivedAt: null },
    });
    const counts = await Promise.all(parts.map((p) => unreadCountFor(p.conversationId, req.user!.id, p.lastReadAt)));
    res.json({ unreadCount: counts.reduce((a, b) => a + b, 0) });
  }),
);

// --- Single conversation ---------------------------------------------------

conversationsRouter.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const me = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: id, userId: req.user!.id } },
    });
    if (!me) throw notFound();

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        participants: { include: { user: { select: { id: true, displayName: true, avatarKey: true } } } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!conversation) throw notFound();

    // Opening the conversation marks it read up to now.
    await prisma.conversationParticipant.update({ where: { id: me.id }, data: { lastReadAt: new Date() } });

    const other = conversation.participants.find((x) => x.userId !== req.user!.id);
    res.json({
      conversation: {
        id: conversation.id,
        context: conversation.context,
        otherParticipant: other ? publicUser(other.user) : null,
        messages: conversation.messages.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          mine: m.senderId === req.user!.id,
          body: m.hiddenAt ? '[message removed by moderators]' : m.body,
          hidden: !!m.hiddenAt,
          createdAt: m.createdAt,
        })),
      },
    });
  }),
);

conversationsRouter.post(
  '/:id/messages',
  requireAuth,
  requireVerified,
  validate({ body: messageSchema }),
  asyncHandler(async (req, res) => {
    const message = await postMessage({
      conversationId: Number(req.params.id),
      senderId: req.user!.id,
      body: req.body.body,
    });
    res.status(201).json({ message: { id: message.id, body: message.body, createdAt: message.createdAt, mine: true } });
  }),
);

for (const [path, value] of [['archive', true], ['unarchive', false]] as const) {
  conversationsRouter.post(
    `/:id/${path}`,
    requireAuth,
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      const me = await prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId: id, userId: req.user!.id } },
      });
      if (!me) throw notFound();
      await prisma.conversationParticipant.update({
        where: { id: me.id },
        data: { archivedAt: value ? new Date() : null },
      });
      res.json({ ok: true });
    }),
  );
}

// --- Blocking --------------------------------------------------------------

conversationsRouter.post(
  '/block',
  requireAuth,
  validate({ body: blockSchema }),
  asyncHandler(async (req, res) => {
    if (req.body.userId === req.user!.id) throw badRequest('You cannot block yourself.');
    await prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId: req.user!.id, blockedId: req.body.userId } },
      create: { blockerId: req.user!.id, blockedId: req.body.userId },
      update: {},
    });
    res.json({ ok: true });
  }),
);

conversationsRouter.delete(
  '/block/:userId',
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.block.deleteMany({
      where: { blockerId: req.user!.id, blockedId: Number(req.params.userId) },
    });
    res.json({ ok: true });
  }),
);
