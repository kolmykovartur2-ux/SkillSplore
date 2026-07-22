import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { anon, loginAs, resetDb, createUser, createSubject, createTutorProfile, prisma } from './helpers.js';

beforeAll(async () => { await resetDb(); });
afterAll(async () => { await prisma.$disconnect(); });

describe('central authorisation', () => {
  it('rejects unauthenticated access to admin endpoints', async () => {
    const res = await anon().get('/api/admin/stats');
    expect(res.status).toBe(401);
  });

  it('forbids non-admins from admin endpoints', async () => {
    await createUser('student-a@test.local', ['STUDENT']);
    const agent = await loginAs('student-a@test.local');
    const res = await agent.get('/api/admin/stats');
    expect(res.status).toBe(403);
  });

  it('allows admins to access admin endpoints', async () => {
    await createUser('admin-a@test.local', ['STUDENT', 'ADMIN']);
    const agent = await loginAs('admin-a@test.local');
    const res = await agent.get('/api/admin/stats');
    expect(res.status).toBe(200);
    expect(res.body.stats).toBeDefined();
  });
});

describe('tutor profile visibility', () => {
  it('does not expose an unapproved profile publicly, but the owner can see it', async () => {
    const tutorUser = await createUser('pending-tutor@test.local', ['STUDENT', 'TUTOR']);
    const profile = await createTutorProfile(tutorUser.id, { status: 'PENDING' });

    const anonRes = await anon().get(`/api/tutors/${profile.id}`);
    expect(anonRes.status).toBe(404);

    const ownerAgent = await loginAs('pending-tutor@test.local');
    const ownerRes = await ownerAgent.get(`/api/tutors/${profile.id}`);
    expect(ownerRes.status).toBe(200);
  });

  it('makes an approved profile publicly searchable', async () => {
    const subject = await createSubject('Testing 101');
    const tutorUser = await createUser('approved-tutor@test.local', ['STUDENT', 'TUTOR']);
    await createTutorProfile(tutorUser.id, { status: 'APPROVED', subjectId: subject.id });

    const res = await anon().get('/api/search');
    expect(res.status).toBe(200);
    expect(res.body.results.some((r: { displayName: string }) => r.displayName === 'approved-tutor')).toBe(true);
  });
});

describe('tutor responses hide competing rates', () => {
  it('never reveals other tutors’ proposed rates to a competing tutor', async () => {
    const student = await createUser('req-student@test.local');
    const subject = await createSubject('Rates Subject');
    const request = await prisma.tutoringRequest.create({
      data: { studentId: student.id, subjectId: subject.id, title: 'Need help', description: 'Please help me learn', status: 'OPEN', publishedAt: new Date() },
    });

    const tutorAUser = await createUser('tutor-a@test.local', ['STUDENT', 'TUTOR']);
    const tutorAProfile = await createTutorProfile(tutorAUser.id, { status: 'APPROVED', subjectId: subject.id });
    const tutorBUser = await createUser('tutor-b@test.local', ['STUDENT', 'TUTOR']);
    await createTutorProfile(tutorBUser.id, { status: 'APPROVED', subjectId: subject.id });

    // Tutor A submits a response with a specific rate.
    await prisma.requestResponse.create({
      data: { requestId: request.id, tutorProfileId: tutorAProfile.id, introduction: 'I can help with this in detail', proposedRateCents: 9999, status: 'PENDING' },
    });

    // Tutor B views the request: must not see Tutor A's rate.
    const agentB = await loginAs('tutor-b@test.local');
    const res = await agentB.get(`/api/requests/${request.id}`);
    expect(res.status).toBe(200);
    expect(res.body.isOwner).toBe(false);
    expect(res.body.responses).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('9999');

    // The owner student, by contrast, sees every response and rate.
    const agentStudent = await loginAs('req-student@test.local');
    const ownerRes = await agentStudent.get(`/api/requests/${request.id}`);
    expect(ownerRes.body.isOwner).toBe(true);
    expect(ownerRes.body.responses).toHaveLength(1);
  });
});

describe('reviews require a completed engagement', () => {
  it('rejects a review when the engagement is not completed', async () => {
    const student = await createUser('rev-student@test.local');
    const tutorUser = await createUser('rev-tutor@test.local', ['STUDENT', 'TUTOR']);
    const profile = await createTutorProfile(tutorUser.id, { status: 'APPROVED' });
    const engagement = await prisma.engagement.create({
      data: { studentId: student.id, tutorProfileId: profile.id, title: 'Sessions', status: 'ARRANGED' },
    });

    const agent = await loginAs('rev-student@test.local');
    const res = await agent.post('/api/reviews').send({ engagementId: engagement.id, rating: 5, body: 'Great tutor and very helpful' });
    expect(res.status).toBe(400);
  });

  it('prevents duplicate reviews for the same engagement', async () => {
    const student = await createUser('rev-student2@test.local');
    const tutorUser = await createUser('rev-tutor2@test.local', ['STUDENT', 'TUTOR']);
    const profile = await createTutorProfile(tutorUser.id, { status: 'APPROVED' });
    const engagement = await prisma.engagement.create({
      data: { studentId: student.id, tutorProfileId: profile.id, title: 'Sessions', status: 'COMPLETED', completedAt: new Date() },
    });

    const agent = await loginAs('rev-student2@test.local');
    const first = await agent.post('/api/reviews').send({ engagementId: engagement.id, rating: 5, body: 'Excellent and thorough teaching' });
    expect(first.status).toBe(201);
    const second = await agent.post('/api/reviews').send({ engagementId: engagement.id, rating: 4, body: 'Trying to review twice here' });
    expect(second.status).toBe(409);

    // Aggregate rating is updated correctly.
    const updated = await prisma.tutorProfile.findUnique({ where: { id: profile.id } });
    expect(updated?.ratingCount).toBe(1);
    expect(updated?.averageRating).toBe(5);
  });
});

describe('private qualification documents', () => {
  it('denies access to a non-owner and allows the owning tutor', async () => {
    const tutorUser = await createUser('doc-tutor@test.local', ['STUDENT', 'TUTOR']);
    const profile = await createTutorProfile(tutorUser.id, { status: 'APPROVED' });
    const qual = await prisma.qualification.create({
      data: { tutorProfileId: profile.id, title: 'Secret Cert', documentKey: 'qualifications/fake-key.txt', documentName: 'cert.txt' },
    });
    await createUser('nosey@test.local');

    const noseyAgent = await loginAs('nosey@test.local');
    const denied = await noseyAgent.get(`/api/files/qualification/${qual.id}`);
    expect(denied.status).toBe(403);

    // Owner is authorised (404 here only because the fake key isn't on disk —
    // authorisation passed, which is what this test asserts).
    const ownerAgent = await loginAs('doc-tutor@test.local');
    const ownerRes = await ownerAgent.get(`/api/files/qualification/${qual.id}`);
    expect(ownerRes.status).not.toBe(403);
  });
});
