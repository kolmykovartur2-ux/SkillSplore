import { beforeEach, describe, expect, it } from 'vitest';
import { anon, createSubject, createTutorProfile, createUser, loginAs, prisma, resetDb } from './helpers.js';
import { normalizeName } from '../src/lib/normalize.js';

beforeEach(async () => {
  await resetDb();
});

describe('search', () => {
  it('only ever returns APPROVED profiles', async () => {
    const approvedUser = await createUser('approved@test.local', ['TUTOR']);
    const pendingUser = await createUser('pending@test.local', ['TUTOR']);
    const subject = await createSubject('Piano');
    await createTutorProfile(approvedUser.id, { status: 'APPROVED', subjectId: subject.id });
    await createTutorProfile(pendingUser.id, { status: 'PENDING', subjectId: subject.id });

    const res = await anon().get('/api/search');
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].displayName).toBe('approved');
  });

  it('filters by categoryId through the subject relation', async () => {
    const tutorUser = await createUser('tutor@test.local', ['TUTOR']);
    const category = await prisma.category.create({ data: { name: 'Music', normalizedName: normalizeName('Music'), slug: 'music-test' } });
    const otherCategory = await prisma.category.create({ data: { name: 'Coding', normalizedName: normalizeName('Coding'), slug: 'coding-test' } });
    const subject = await prisma.subject.create({ data: { name: 'Guitar', normalizedName: 'guitar', slug: 'guitar-test', categoryId: category.id } });
    const otherSubject = await prisma.subject.create({ data: { name: 'Python', normalizedName: 'python', slug: 'python-test', categoryId: otherCategory.id } });
    await createTutorProfile(tutorUser.id, { subjectId: subject.id });

    const matched = await anon().get(`/api/search?categoryId=${category.id}`);
    expect(matched.body.results).toHaveLength(1);

    const unmatched = await anon().get(`/api/search?categoryId=${otherCategory.id}`);
    expect(unmatched.body.results).toHaveLength(0);
    void otherSubject;
  });

  it('filters by price range', async () => {
    const cheapUser = await createUser('cheap@test.local', ['TUTOR']);
    const pricyUser = await createUser('pricy@test.local', ['TUTOR']);
    const subject = await createSubject('Guitar');
    await prisma.tutorProfile.create({
      data: { userId: cheapUser.id, status: 'APPROVED', headline: 'Cheap', experience: 'x', teachingStyle: 'x', hourlyRateCents: 2000, deliveryMode: 'ONLINE', approvedAt: new Date(), subjects: { create: { subjectId: subject.id } } },
    });
    await prisma.tutorProfile.create({
      data: { userId: pricyUser.id, status: 'APPROVED', headline: 'Pricy', experience: 'x', teachingStyle: 'x', hourlyRateCents: 20000, deliveryMode: 'ONLINE', approvedAt: new Date(), subjects: { create: { subjectId: subject.id } } },
    });

    const res = await anon().get('/api/search?maxPrice=5000');
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].headline).toBe('Cheap');
  });
});

describe('registration, login, logout', () => {
  it('registers a new account and logs in immediately', async () => {
    const res = await anon().post('/api/auth/register').send({
      email: 'newperson@test.local',
      password: 'password12345',
      displayName: 'New Person',
      acceptTerms: true,
    });
    expect(res.status).toBe(201);
    const cookie = res.headers['set-cookie'];
    expect(cookie).toBeDefined();
    const me = await anon().get('/api/auth/me').set('Cookie', cookie);
    expect(me.body.user.email).toBe('newperson@test.local');
  });

  it('rejects registration without accepting terms', async () => {
    const res = await anon().post('/api/auth/register').send({
      email: 'noterms@test.local',
      password: 'password12345',
      displayName: 'No Terms',
      acceptTerms: false,
    });
    expect(res.status).toBe(400);
  });

  it('logs out and invalidates the session', async () => {
    await createUser('logout@test.local');
    const agent = await loginAs('logout@test.local');
    const before = await agent.get('/api/auth/me');
    expect(before.body.user).not.toBeNull();

    await agent.post('/api/auth/logout');
    const after = await agent.get('/api/auth/me');
    expect(after.body.user).toBeNull();
  });

  it('a suspended account is rejected on every subsequent request, not just at login', async () => {
    const user = await createUser('suspended@test.local');
    const agent = await loginAs('suspended@test.local');
    await prisma.user.update({ where: { id: user.id }, data: { status: 'SUSPENDED', suspendedAt: new Date() } });

    const res = await agent.get('/api/conversations');
    expect(res.status).toBe(403);
  });
});

describe('messaging: conversation membership and blocking', () => {
  it('a user who is not a participant cannot open the conversation', async () => {
    const a = await createUser('a@test.local');
    const b = await createUser('b@test.local');
    const outsider = await createUser('outsider@test.local');
    const conversation = await prisma.conversation.create({
      data: { context: 'DIRECT_ENQUIRY', participants: { create: [{ userId: a.id }, { userId: b.id }] } },
    });

    const outsiderAgent = await loginAs('outsider@test.local');
    const res = await outsiderAgent.get(`/api/conversations/${conversation.id}`);
    expect(res.status).toBe(404);
  });

  it('a blocked user cannot send a message into an existing conversation', async () => {
    const a = await createUser('a@test.local');
    const b = await createUser('b@test.local');
    const conversation = await prisma.conversation.create({
      data: { context: 'DIRECT_ENQUIRY', participants: { create: [{ userId: a.id }, { userId: b.id }] } },
    });
    await prisma.block.create({ data: { blockerId: b.id, blockedId: a.id } });

    const aAgent = await loginAs('a@test.local');
    // a must be verified to send (requireVerified) — mark verified directly.
    await prisma.user.update({ where: { id: a.id }, data: { emailVerifiedAt: new Date() } });
    const res = await aAgent.post(`/api/conversations/${conversation.id}/messages`).send({ body: 'Hello?' });
    expect(res.status).toBe(403);
  });

  it('blocking is symmetric — the blocker also cannot message the person they blocked', async () => {
    const a = await createUser('a@test.local');
    const b = await createUser('b@test.local');
    const conversation = await prisma.conversation.create({
      data: { context: 'DIRECT_ENQUIRY', participants: { create: [{ userId: a.id }, { userId: b.id }] } },
    });
    await prisma.block.create({ data: { blockerId: a.id, blockedId: b.id } });
    await prisma.user.update({ where: { id: a.id }, data: { emailVerifiedAt: new Date() } });

    const aAgent = await loginAs('a@test.local');
    const res = await aAgent.post(`/api/conversations/${conversation.id}/messages`).send({ body: 'Hello?' });
    expect(res.status).toBe(403);
  });
});
