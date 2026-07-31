import supertest from 'supertest';
import type { Role } from '@prisma/client';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { hashPassword } from '../src/lib/password.js';
import { normalizeName } from '../src/lib/normalize.js';

export const app = createApp();
export { prisma };

const PASSWORD = 'password123';

export async function resetDb(): Promise<void> {
  await prisma.$transaction([
    prisma.review.deleteMany(),
    prisma.engagement.deleteMany(),
    prisma.message.deleteMany(),
    prisma.conversationParticipant.deleteMany(),
    prisma.conversation.deleteMany(),
    prisma.requestResponse.deleteMany(),
    prisma.tutoringRequest.deleteMany(),
    prisma.report.deleteMany(),
    prisma.savedTutor.deleteMany(),
    prisma.qualification.deleteMany(),
    prisma.availabilitySlot.deleteMany(),
    prisma.tutorSubject.deleteMany(),
    prisma.tutorProfile.deleteMany(),
    prisma.emailToken.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.adminNote.deleteMany(),
    prisma.subjectSuggestion.deleteMany(),
    prisma.subject.deleteMany(),
    prisma.teachingLevel.deleteMany(),
    prisma.category.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

export async function createUser(email: string, roles: Role[] = ['STUDENT'], verified = true) {
  return prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(PASSWORD),
      displayName: email.split('@')[0]!,
      roles,
      emailVerifiedAt: verified ? new Date() : null,
      termsAcceptedAt: new Date(),
    },
  });
}

// Returns a supertest agent with an authenticated session cookie.
export async function loginAs(email: string) {
  const agent = supertest.agent(app);
  const res = await agent.post('/api/auth/login').send({ email, password: PASSWORD });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
}

export function anon() {
  return supertest(app);
}

export async function createSubject(name: string) {
  return prisma.subject.create({ data: { name, normalizedName: normalizeName(name), slug: name.toLowerCase().replace(/\s+/g, '-') } });
}

export async function createTutorProfile(userId: number, opts: { status?: 'DRAFT' | 'PENDING' | 'APPROVED'; subjectId?: number } = {}) {
  return prisma.tutorProfile.create({
    data: {
      userId,
      status: opts.status ?? 'APPROVED',
      headline: 'Test tutor',
      experience: 'Experienced.',
      teachingStyle: 'Clear.',
      hourlyRateCents: 5000,
      deliveryMode: 'ONLINE',
      approvedAt: opts.status === 'APPROVED' ? new Date() : null,
      ...(opts.subjectId ? { subjects: { create: { subjectId: opts.subjectId } } } : {}),
    },
  });
}
