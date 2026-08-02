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

describe('subject suggestions never fragment the catalogue', () => {
  it('requires authentication to suggest a subject', async () => {
    const res = await anon().post('/api/subjects/suggest').send({ name: 'Beekeeping' });
    expect(res.status).toBe(401);
  });

  it('resolves instantly to an existing subject instead of creating a duplicate', async () => {
    await createSubject('Watercolour Painting');
    const student = await createUser('dup-student@test.local');
    const agent = await loginAs('dup-student@test.local');

    // Same subject, different case/whitespace/punctuation -- must not create a new row.
    const res = await agent.post('/api/subjects/suggest').send({ name: '  watercolour   painting!' });
    expect(res.status).toBe(200);
    expect(res.body.resolution).toBe('already_exists');
    expect(res.body.subject.name).toBe('Watercolour Painting');

    const count = await prisma.subject.count({ where: { normalizedName: 'watercolour painting' } });
    expect(count).toBe(1);
  });

  it('queues a genuinely new suggestion instead of creating a Subject directly', async () => {
    const student = await createUser('sugg-student@test.local');
    const agent = await loginAs('sugg-student@test.local');
    const res = await agent.post('/api/subjects/suggest').send({ name: 'Falconry' });
    expect(res.status).toBe(201);
    expect(res.body.resolution).toBe('queued');

    const bySameNorm = await prisma.subject.findFirst({ where: { normalizedName: 'falconry' } });
    expect(bySameNorm).toBeNull(); // no Subject row created yet
    const pending = await prisma.subjectSuggestion.findFirst({ where: { normalizedName: 'falconry', status: 'PENDING' } });
    expect(pending).not.toBeNull();
  });

  it('does not duplicate an already-pending suggestion', async () => {
    const a = await createUser('sugg-a@test.local');
    const b = await createUser('sugg-b@test.local');
    const agentA = await loginAs('sugg-a@test.local');
    const agentB = await loginAs('sugg-b@test.local');

    await agentA.post('/api/subjects/suggest').send({ name: 'Falconry Advanced' });
    const second = await agentB.post('/api/subjects/suggest').send({ name: 'falconry advanced' });
    expect(second.body.resolution).toBe('already_suggested');

    const count = await prisma.subjectSuggestion.count({ where: { normalizedName: 'falconry advanced' } });
    expect(count).toBe(1);
  });

  it('forbids non-admins from the review queue and its actions', async () => {
    const student = await createUser('sugg-nonadmin@test.local');
    const agent = await loginAs('sugg-nonadmin@test.local');
    const list = await agent.get('/api/admin/subject-suggestions');
    expect(list.status).toBe(403);
    const approve = await agent.post('/api/admin/subject-suggestions/1/approve').send({ categoryId: null });
    expect(approve.status).toBe(403);
  });

  it('lets an admin approve a suggestion, creating exactly one Subject', async () => {
    const submitter = await createUser('sugg-submitter@test.local');
    const submitterAgent = await loginAs('sugg-submitter@test.local');
    const created = await submitterAgent.post('/api/subjects/suggest').send({ name: 'Bonsai Cultivation' });
    const suggestionId = created.body.suggestion.id;

    await createUser('sugg-admin@test.local', ['STUDENT', 'ADMIN']);
    const adminAgent = await loginAs('sugg-admin@test.local');
    const approve = await adminAgent.post(`/api/admin/subject-suggestions/${suggestionId}/approve`).send({ categoryId: null });
    expect(approve.status).toBe(200);

    const subjects = await prisma.subject.findMany({ where: { normalizedName: 'bonsai cultivation' } });
    expect(subjects).toHaveLength(1);

    // Approving twice is refused, not double-applied.
    const again = await adminAgent.post(`/api/admin/subject-suggestions/${suggestionId}/approve`).send({ categoryId: null });
    expect(again.status).toBe(400);
    const stillOne = await prisma.subject.count({ where: { normalizedName: 'bonsai cultivation' } });
    expect(stillOne).toBe(1);
  });
});

describe('per-account brute-force lockout', () => {
  it('locks the account after repeated wrong passwords, and a correct password stays rejected until it clears', async () => {
    await createUser('lockout-target@test.local');

    // Default threshold is 8. Exhaust it with wrong passwords.
    for (let i = 0; i < 8; i++) {
      const res = await anon().post('/api/auth/login').send({ email: 'lockout-target@test.local', password: 'wrong-password' });
      expect(res.status).toBe(401);
    }

    // Now even the correct password is rejected -- same generic message, so
    // the response doesn't distinguish "locked" from "wrong password".
    const correctButLocked = await anon().post('/api/auth/login').send({ email: 'lockout-target@test.local', password: 'password123' });
    expect(correctButLocked.status).toBe(401);
    expect(correctButLocked.body.error.message).toBe('Incorrect email or password.');

    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'lockout-target@test.local' } });
    expect(user.lockedUntil).not.toBeNull();
  });

  it('a successful password reset clears the lockout immediately, without waiting out the timer', async () => {
    const user = await createUser('lockout-reset@test.local');
    await prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: 8, lockedUntil: new Date(Date.now() + 60 * 60 * 1000) } });

    const token = 'a'.repeat(32);
    const { hashToken } = await import('../src/lib/tokens.js');
    await prisma.emailToken.create({
      data: { userId: user.id, type: 'RESET_PASSWORD', tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });

    const reset = await anon().post('/api/auth/reset-password').send({ token, password: 'brandNewPassword123' });
    expect(reset.status).toBe(200);

    const login = await anon().post('/api/auth/login').send({ email: 'lockout-reset@test.local', password: 'brandNewPassword123' });
    expect(login.status).toBe(200);

    const refreshed = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(refreshed.lockedUntil).toBeNull();
    expect(refreshed.failedLoginCount).toBe(0);
  });
});

describe('verification records replace the generic "verified" boolean', () => {
  it('forbids non-admins from adding or revoking verifications', async () => {
    const tutorUser = await createUser('ver-nonadmin@test.local', ['STUDENT', 'TUTOR']);
    const profile = await createTutorProfile(tutorUser.id, { status: 'APPROVED' });
    await createUser('ver-nonadmin-caller@test.local');
    const agent = await loginAs('ver-nonadmin-caller@test.local');

    const add = await agent.post(`/api/admin/tutors/${profile.id}/verifications`).send({ type: 'IDENTITY_DOCUMENT' });
    expect(add.status).toBe(403);
  });

  it('admin can add a named verification and it appears on the public profile with its exact label', async () => {
    const tutorUser = await createUser('ver-tutor@test.local', ['STUDENT', 'TUTOR']);
    const profile = await createTutorProfile(tutorUser.id, { status: 'APPROVED' });
    await createUser('ver-admin@test.local', ['STUDENT', 'ADMIN']);
    const adminAgent = await loginAs('ver-admin@test.local');

    const add = await adminAgent
      .post(`/api/admin/tutors/${profile.id}/verifications`)
      .send({ type: 'IDENTITY_DOCUMENT', evidenceRef: 'Passport sighted' });
    expect(add.status).toBe(201);
    expect(add.body.verification.label).toBe('Identity checked');

    const publicRes = await anon().get(`/api/tutors/${profile.id}`);
    expect(publicRes.status).toBe(200);
    expect(publicRes.body.profile.verifications).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'IDENTITY_DOCUMENT', label: 'Identity checked' })]),
    );
    // Never a generic claim -- the exact label is what's shown, not a bare "Verified".
    expect(JSON.stringify(publicRes.body.profile.verifications)).not.toContain('"label":"Verified"');
  });

  it('a revoked verification stops appearing on the public profile', async () => {
    const tutorUser = await createUser('ver-revoke-tutor@test.local', ['STUDENT', 'TUTOR']);
    const profile = await createTutorProfile(tutorUser.id, { status: 'APPROVED' });
    await createUser('ver-revoke-admin@test.local', ['STUDENT', 'ADMIN']);
    const adminAgent = await loginAs('ver-revoke-admin@test.local');

    const add = await adminAgent.post(`/api/admin/tutors/${profile.id}/verifications`).send({ type: 'EMAIL_CONFIRMED' });
    const verificationId = add.body.verification.id;

    const beforeRevoke = await anon().get(`/api/tutors/${profile.id}`);
    expect(beforeRevoke.body.profile.verifications).toHaveLength(1);

    const revoke = await adminAgent.post(`/api/admin/verifications/${verificationId}/revoke`).send({ reason: 'Email changed, no longer confirmed' });
    expect(revoke.status).toBe(200);

    const afterRevoke = await anon().get(`/api/tutors/${profile.id}`);
    expect(afterRevoke.body.profile.verifications).toHaveLength(0);
  });

  it('verifying a qualification through the existing endpoint also creates a named verification record', async () => {
    const tutorUser = await createUser('ver-qual-tutor@test.local', ['STUDENT', 'TUTOR']);
    const profile = await createTutorProfile(tutorUser.id, { status: 'APPROVED' });
    const qualification = await prisma.qualification.create({
      data: { tutorProfileId: profile.id, title: 'BSc Mathematics' },
    });
    await createUser('ver-qual-admin@test.local', ['STUDENT', 'ADMIN']);
    const adminAgent = await loginAs('ver-qual-admin@test.local');

    const verify = await adminAgent.post(`/api/admin/qualifications/${qualification.id}/verify`);
    expect(verify.status).toBe(200);

    const record = await prisma.verification.findFirst({ where: { tutorProfileId: profile.id, type: 'QUALIFICATION_DOCUMENT' } });
    expect(record).not.toBeNull();
    expect(record?.label).toBe('Qualification document checked');
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
