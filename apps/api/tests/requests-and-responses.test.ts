import { beforeEach, describe, expect, it } from 'vitest';
import { anon, createSubject, createTutorProfile, createUser, loginAs, prisma, resetDb } from './helpers.js';

beforeEach(async () => {
  await resetDb();
});

describe('learning request creation', () => {
  it('rejects a minimum budget greater than the maximum', async () => {
    await createUser('student@test.local');
    const subject = await createSubject('Algebra');
    const agent = await loginAs('student@test.local');
    const res = await agent.post('/api/requests').send({
      subjectId: subject.id,
      title: 'Help with algebra',
      description: 'Need help preparing for an exam in three weeks.',
      budgetMinCents: 10000,
      budgetMaxCents: 5000,
      publish: true,
    });
    expect(res.status).toBe(400);
  });

  it('creates a DRAFT when publish is omitted, and OPEN when publish is true', async () => {
    await createUser('student@test.local');
    const subject = await createSubject('Algebra');
    const agent = await loginAs('student@test.local');

    const draft = await agent.post('/api/requests').send({
      subjectId: subject.id,
      title: 'Help with algebra',
      description: 'Need help preparing for an exam in three weeks.',
    });
    expect(draft.body.request.status).toBe('DRAFT');

    const published = await agent.post('/api/requests').send({
      subjectId: subject.id,
      title: 'Help with algebra 2',
      description: 'Need help preparing for an exam in three weeks.',
      publish: true,
    });
    expect(published.body.request.status).toBe('OPEN');
  });

  it('blocks editing once a request is closed', async () => {
    const student = await createUser('student@test.local');
    const subject = await createSubject('Algebra');
    const request = await prisma.tutoringRequest.create({
      data: { studentId: student.id, subjectId: subject.id, title: 'Algebra help', description: 'Need help with algebra basics.', status: 'CLOSED', closedAt: new Date() },
    });
    const agent = await loginAs('student@test.local');
    const res = await agent.patch(`/api/requests/${request.id}`).send({ title: 'Updated title' });
    expect(res.status).toBe(400);
  });

  it('only the owning student can edit their request', async () => {
    const owner = await createUser('owner@test.local');
    await createUser('other@test.local');
    const subject = await createSubject('Algebra');
    const request = await prisma.tutoringRequest.create({
      data: { studentId: owner.id, subjectId: subject.id, title: 'Algebra help', description: 'Need help with algebra basics.', status: 'OPEN', publishedAt: new Date() },
    });
    const agent = await loginAs('other@test.local');
    const res = await agent.patch(`/api/requests/${request.id}`).send({ title: 'Hijacked title' });
    expect(res.status).toBe(403);
  });

  it('an owner can edit an open request without disturbing its status or responses', async () => {
    const student = await createUser('student@test.local');
    const tutorUser = await createUser('tutor@test.local', ['TUTOR']);
    const subject = await createSubject('Algebra');
    const profile = await createTutorProfile(tutorUser.id, { status: 'APPROVED', subjectId: subject.id });
    const request = await prisma.tutoringRequest.create({
      data: { studentId: student.id, subjectId: subject.id, title: 'Algebra help', description: 'Need help with algebra basics.', status: 'OPEN', publishedAt: new Date() },
    });
    await prisma.requestResponse.create({
      data: { requestId: request.id, tutorProfileId: profile.id, introduction: 'I can help with this.' },
    });

    const agent = await loginAs('student@test.local');
    const res = await agent.patch(`/api/requests/${request.id}`).send({
      title: 'Algebra help, corrected',
      description: 'Need help with algebra basics before an exam.',
      deliveryMode: 'ONLINE',
    });

    expect(res.status).toBe(200);
    expect(res.body.request.title).toBe('Algebra help, corrected');
    expect(res.body.request.deliveryMode).toBe('ONLINE');
    // Editing must not quietly unpublish the request or discard replies.
    expect(res.body.request.status).toBe('OPEN');
    expect(await prisma.requestResponse.count({ where: { requestId: request.id } })).toBe(1);
  });

  it('clears an optional field when it is sent empty, rather than keeping the old value', async () => {
    const student = await createUser('student@test.local');
    const subject = await createSubject('Algebra');
    const request = await prisma.tutoringRequest.create({
      data: {
        studentId: student.id, subjectId: subject.id, title: 'Algebra help',
        description: 'Need help with algebra basics.', status: 'OPEN',
        publishedAt: new Date(), timing: 'Weekday evenings',
      },
    });

    const agent = await loginAs('student@test.local');
    const res = await agent.patch(`/api/requests/${request.id}`).send({ timing: '' });

    expect(res.status).toBe(200);
    const after = await prisma.tutoringRequest.findUniqueOrThrow({ where: { id: request.id } });
    expect(after.timing).toBe('');
  });
});

describe('tutor request feed access', () => {
  it('requires an approved tutor profile', async () => {
    await createUser('student@test.local');
    const agent = await loginAs('student@test.local');
    const res = await agent.get('/api/requests/feed');
    expect(res.status).toBe(403);
  });

  it('an approved tutor sees only OPEN requests matching their subjects', async () => {
    const tutorUser = await createUser('tutor@test.local', ['TUTOR']);
    const subject = await createSubject('Algebra');
    const otherSubject = await createSubject('Piano');
    await createTutorProfile(tutorUser.id, { subjectId: subject.id });

    const student = await createUser('student@test.local');
    await prisma.tutoringRequest.create({
      data: { studentId: student.id, subjectId: subject.id, title: 'Matches', description: 'Matches the tutor subject list here.', status: 'OPEN', publishedAt: new Date() },
    });
    await prisma.tutoringRequest.create({
      data: { studentId: student.id, subjectId: otherSubject.id, title: 'No match', description: 'Does not match the tutor subject list.', status: 'OPEN', publishedAt: new Date() },
    });
    await prisma.tutoringRequest.create({
      data: { studentId: student.id, subjectId: subject.id, title: 'Draft', description: 'Matches subject but never published at all.', status: 'DRAFT' },
    });

    const agent = await loginAs('tutor@test.local');
    const res = await agent.get('/api/requests/feed');
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].title).toBe('Matches');
  });
});

describe('response submission and duplicate prevention', () => {
  async function setup() {
    const student = await createUser('student@test.local');
    const tutorUser = await createUser('tutor@test.local', ['TUTOR']);
    const subject = await createSubject('Algebra');
    const profile = await createTutorProfile(tutorUser.id, { subjectId: subject.id });
    const request = await prisma.tutoringRequest.create({
      data: { studentId: student.id, subjectId: subject.id, title: 'Algebra help', description: 'Need help with algebra basics please.', status: 'OPEN', publishedAt: new Date() },
    });
    return { student, tutorUser, subject, profile, request };
  }

  it('lets an approved tutor respond once', async () => {
    const { request } = await setup();
    const agent = await loginAs('tutor@test.local');
    const res = await agent.post('/api/responses').send({ requestId: request.id, introduction: 'I can help with this, happy to start soon.' });
    expect(res.status).toBe(201);
  });

  it('rejects a second active response to the same request from the same tutor', async () => {
    const { request } = await setup();
    const agent = await loginAs('tutor@test.local');
    await agent.post('/api/responses').send({ requestId: request.id, introduction: 'First response text here for the request.' });
    const second = await agent.post('/api/responses').send({ requestId: request.id, introduction: 'Second response text here for the request.' });
    expect(second.status).toBe(400);
  });

  it('allows re-submitting after withdrawing', async () => {
    const { request } = await setup();
    const agent = await loginAs('tutor@test.local');
    const first = await agent.post('/api/responses').send({ requestId: request.id, introduction: 'First response text here for the request.' });
    await agent.post(`/api/responses/${first.body.responseId}/withdraw`);
    const second = await agent.post('/api/responses').send({ requestId: request.id, introduction: 'Second response text here for the request.' });
    expect(second.status).toBe(201);
  });

  it('rejects a student responding to their own request', async () => {
    const { request, student } = await setup();
    // Give the student an approved tutor profile too (one account can hold both roles).
    const subject = await prisma.subject.findUniqueOrThrow({ where: { id: request.subjectId } });
    await createTutorProfile(student.id, { subjectId: subject.id });
    const agent = await loginAs('student@test.local');
    const res = await agent.post('/api/responses').send({ requestId: request.id, introduction: 'Trying to respond to my own request here.' });
    expect(res.status).toBe(400);
  });

  it('rejects a response to a non-open request', async () => {
    const { request } = await setup();
    await prisma.tutoringRequest.update({ where: { id: request.id }, data: { status: 'PAUSED' } });
    const agent = await loginAs('tutor@test.local');
    const res = await agent.post('/api/responses').send({ requestId: request.id, introduction: 'Trying to respond while paused here.' });
    expect(res.status).toBe(400);
  });

  it('accepting a response creates a conversation and an engagement, and blocks re-acceptance', async () => {
    const { request } = await setup();
    const tutorAgent = await loginAs('tutor@test.local');
    const submitted = await tutorAgent.post('/api/responses').send({ requestId: request.id, introduction: 'Happy to help with algebra basics here.' });

    const studentAgent = await loginAs('student@test.local');
    const accepted = await studentAgent.post(`/api/responses/${submitted.body.responseId}/accept`);
    expect(accepted.status).toBe(200);
    expect(accepted.body.conversationId).toBeDefined();
    expect(accepted.body.engagementId).toBeDefined();

    const engagement = await prisma.engagement.findUnique({ where: { id: accepted.body.engagementId } });
    expect(engagement?.status).toBe('ARRANGED');

    const secondAccept = await studentAgent.post(`/api/responses/${submitted.body.responseId}/accept`);
    expect(secondAccept.status).toBe(400);

    // An accepted response cannot be withdrawn by the tutor.
    const withdraw = await tutorAgent.post(`/api/responses/${submitted.body.responseId}/withdraw`);
    expect(withdraw.status).toBe(400);
  });

  it('never lets a competing tutor see who else responded or at what rate (response list stays scoped to the owner)', async () => {
    const { request } = await setup();
    const secondTutorUser = await createUser('tutor2@test.local', ['TUTOR']);
    await createTutorProfile(secondTutorUser.id, { subjectId: request.subjectId });

    const firstAgent = await loginAs('tutor@test.local');
    await firstAgent.post('/api/responses').send({ requestId: request.id, introduction: 'First tutor introduction text here please.', proposedRateCents: 5000 });

    const secondAgent = await loginAs('tutor2@test.local');
    const detail = await secondAgent.get(`/api/requests/${request.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.isOwner).toBe(false);
    expect(detail.body.responseCount).toBe(1);
    expect(detail.body.responses).toBeUndefined();
  });
});

describe('unauthenticated access', () => {
  it('requires auth to post a request', async () => {
    const res = await anon().post('/api/requests').send({ title: 'x' });
    expect(res.status).toBe(401);
  });

  it('requires auth to submit a response', async () => {
    const res = await anon().post('/api/responses').send({ requestId: 1, introduction: 'x' });
    expect(res.status).toBe(401);
  });
});
