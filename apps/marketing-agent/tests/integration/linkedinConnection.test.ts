import { beforeEach, describe, expect, it } from 'vitest';
import { createAdmin, loginAs, prisma, resetDb } from '../helpers.js';

beforeEach(async () => {
  await resetDb();
  await createAdmin('founder@test.local');
});

describe('LinkedIn connection status', () => {
  it('reports demo_mock mode when MOCK_LINKEDIN_API is true (test env default)', async () => {
    const agent = await loginAs('founder@test.local');
    const res = await agent.get('/api/linkedin/status');
    expect(res.status).toBe(200);
    expect(res.body.mode).toBe('demo_mock');
    expect(res.body.connected).toBe(true);
  });
});

describe('disconnect', () => {
  it('wipes stored tokens but preserves published-post history', async () => {
    const agent = await loginAs('founder@test.local');
    const admin = await prisma.adminUser.findFirstOrThrow();
    const connection = await prisma.linkedinConnection.create({
      data: {
        ownerAdminUserId: admin.id,
        encryptedAccessToken: 'fake-ciphertext',
        encryptedRefreshToken: 'fake-ciphertext-2',
        connectionStatus: 'CONNECTED',
        grantedScopes: ['w_organization_social'],
      },
    });
    const draft = await prisma.contentDraft.create({
      data: { contentType: 'TEXT_ONLY', body: 'Published before disconnect.', generationProvider: 'template', status: 'PUBLISHED', publishedAt: new Date() },
    });
    const published = await prisma.publishedPost.create({
      data: { draftId: draft.id, linkedinPostUrn: 'urn:li:share:before-disconnect', publishedUrl: 'https://linkedin.com/x' },
    });

    const res = await agent.post('/api/linkedin/disconnect');
    expect(res.status).toBe(200);

    const updated = await prisma.linkedinConnection.findUniqueOrThrow({ where: { id: connection.id } });
    expect(updated.encryptedAccessToken).toBeNull();
    expect(updated.encryptedRefreshToken).toBeNull();
    expect(updated.connectionStatus).toBe('REVOKED');

    const stillThere = await prisma.publishedPost.findUniqueOrThrow({ where: { id: published.id } });
    expect(stillThere.linkedinPostUrn).toBe('urn:li:share:before-disconnect');
  });
});
