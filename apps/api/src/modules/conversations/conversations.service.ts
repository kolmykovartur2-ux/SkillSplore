import { prisma } from '../../lib/prisma.js';
import { forbidden } from '../../lib/errors.js';
import { notify } from '../../lib/notify.js';
import type { ConversationContext } from '@prisma/client';

// Returns true if either user has blocked the other.
export async function areBlocked(a: number, b: number): Promise<boolean> {
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
  });
  return !!block;
}

export async function getOrCreateConversation(input: {
  studentId: number;
  tutorUserId: number;
  tutorProfileId: number;
  context: ConversationContext;
  requestId?: number;
}) {
  const { studentId, tutorUserId, tutorProfileId, context, requestId } = input;

  const existing = await prisma.conversation.findFirst({
    where: {
      context,
      tutorProfileId,
      requestId: requestId ?? null,
      participants: { some: { userId: studentId } },
    },
  });
  if (existing) return existing;

  return prisma.conversation.create({
    data: {
      context,
      tutorProfileId,
      requestId: requestId ?? null,
      participants: { create: [{ userId: studentId }, { userId: tutorUserId }] },
    },
  });
}

export async function postMessage(input: { conversationId: number; senderId: number; body: string }) {
  const participants = await prisma.conversationParticipant.findMany({
    where: { conversationId: input.conversationId },
  });
  const me = participants.find((p) => p.userId === input.senderId);
  if (!me) throw forbidden('You are not part of this conversation.');
  const other = participants.find((p) => p.userId !== input.senderId);

  if (other && (await areBlocked(input.senderId, other.userId))) {
    throw forbidden('Messaging is unavailable between these accounts.');
  }

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: { conversationId: input.conversationId, senderId: input.senderId, body: input.body },
    }),
    prisma.conversation.update({
      where: { id: input.conversationId },
      data: { lastMessageAt: new Date() },
    }),
    prisma.conversationParticipant.update({ where: { id: me.id }, data: { lastReadAt: new Date() } }),
  ]);

  if (other) {
    const sender = await prisma.user.findUnique({ where: { id: input.senderId }, select: { displayName: true } });
    await notify({
      userId: other.userId,
      type: 'message',
      title: `New message from ${sender?.displayName ?? 'a user'}`,
      body: input.body.slice(0, 140),
      linkUrl: `/messages/${input.conversationId}`,
    });
  }
  return message;
}
