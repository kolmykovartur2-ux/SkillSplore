import { beforeEach, describe, expect, it } from 'vitest';
import { anon, createAdmin, resetDb } from '../helpers.js';

beforeEach(async () => {
  await resetDb();
});

describe('auth', () => {
  it('rejects an unknown email with a generic message', async () => {
    const res = await anon().post('/api/auth/login').send({ email: 'nobody@test.local', password: 'password12345' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Incorrect email or password.');
  });

  it('logs in with the right credentials and can fetch /auth/me', async () => {
    await createAdmin('founder@test.local');
    const agent = anon();
    const login = await agent.post('/api/auth/login').send({ email: 'founder@test.local', password: 'password12345' });
    expect(login.status).toBe(200);

    // cookie jar isn't preserved on a plain `anon()` supertest instance per request,
    // so re-issue with the returned cookie explicitly.
    const cookie = login.headers['set-cookie'];
    const me = await anon().get('/api/auth/me').set('Cookie', cookie);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe('founder@test.local');
  });

  it('rejects a wrong password with the same generic message as an unknown account', async () => {
    await createAdmin('founder@test.local');
    const res = await anon().post('/api/auth/login').send({ email: 'founder@test.local', password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Incorrect email or password.');
  });

  it('requires auth for protected routes', async () => {
    const res = await anon().get('/api/drafts');
    expect(res.status).toBe(401);
  });
});
