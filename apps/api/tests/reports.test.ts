/**
 * The moderation backend has always accepted five entity types, but the
 * frontend only ever reported profiles and messages, so requests, reviews and
 * accounts were unreportable in practice. These pin down that every type the
 * schema advertises genuinely works end to end, so the new shared
 * ReportButton cannot be pointed at a type the server quietly rejects.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { anon, createSubject, createTutorProfile, createUser, loginAs, prisma, resetDb } from './helpers.js';

beforeEach(async () => {
  await resetDb();
});

describe('reporting', () => {
  it('accepts every entity type the moderation backend advertises', async () => {
    const reporter = await createUser('reporter@test.local');
    const subject = await createSubject('Algebra');
    const tutorUser = await createUser('tutor@test.local', ['TUTOR']);
    const profile = await createTutorProfile(tutorUser.id, { status: 'APPROVED', subjectId: subject.id });
    const request = await prisma.tutoringRequest.create({
      data: { studentId: reporter.id, subjectId: subject.id, title: 'Algebra help', description: 'Need help with algebra basics.', status: 'OPEN', publishedAt: new Date() },
    });
    const conversation = await prisma.conversation.create({
      data: { context: 'DIRECT_ENQUIRY', participants: { create: [{ userId: reporter.id }, { userId: tutorUser.id }] } },
    });
    const message = await prisma.message.create({
      data: { conversationId: conversation.id, senderId: tutorUser.id, body: 'Hello there.' },
    });
    const engagement = await prisma.engagement.create({
      data: { studentId: reporter.id, tutorProfileId: profile.id, subjectId: subject.id, title: 'Algebra sessions', status: 'COMPLETED', completedAt: new Date() },
    });
    const review = await prisma.review.create({
      data: { engagementId: engagement.id, studentId: reporter.id, tutorProfileId: profile.id, rating: 5, body: 'Great sessions.' },
    });

    const agent = await loginAs('reporter@test.local');
    const cases: Array<[string, number]> = [
      ['TUTOR_PROFILE', profile.id],
      ['REQUEST', request.id],
      ['MESSAGE', message.id],
      ['REVIEW', review.id],
      ['USER', tutorUser.id],
    ];

    for (const [entityType, entityId] of cases) {
      const res = await agent.post('/api/reports').send({ entityType, entityId, reason: 'Spam or advertising' });
      expect(res.status, `${entityType} should be reportable`).toBe(201);
    }

    expect(await prisma.report.count()).toBe(cases.length);
  });

  it('rejects a report against something that does not exist', async () => {
    await createUser('reporter@test.local');
    const agent = await loginAs('reporter@test.local');

    const res = await agent.post('/api/reports').send({ entityType: 'REQUEST', entityId: 999999, reason: 'Spam or advertising' });

    expect(res.status).toBe(400);
    expect(await prisma.report.count()).toBe(0);
  });

  it('collapses a repeat report instead of creating a duplicate', async () => {
    const reporter = await createUser('reporter@test.local');
    const subject = await createSubject('Algebra');
    const request = await prisma.tutoringRequest.create({
      data: { studentId: reporter.id, subjectId: subject.id, title: 'Algebra help', description: 'Need help with algebra basics.', status: 'OPEN', publishedAt: new Date() },
    });

    const agent = await loginAs('reporter@test.local');
    const first = await agent.post('/api/reports').send({ entityType: 'REQUEST', entityId: request.id, reason: 'Spam or advertising' });
    const second = await agent.post('/api/reports').send({ entityType: 'REQUEST', entityId: request.id, reason: 'Spam or advertising' });

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.alreadyReported).toBe(true);
    expect(await prisma.report.count()).toBe(1);
  });

  it('requires a session, so reports are always attributable', async () => {
    const res = await anon().post('/api/reports').send({ entityType: 'USER', entityId: 1, reason: 'Spam or advertising' });
    expect(res.status).toBe(401);
  });
});
