import { beforeEach, describe, expect, it } from 'vitest';
import { createAdmin, createFact, loginAs, prisma, resetDb } from '../helpers.js';
import { getActiveApprovedFacts } from '../../src/lib/facts.js';

beforeEach(async () => {
  await resetDb();
  await createAdmin('founder@test.local');
});

describe('fact-source validation', () => {
  it('only returns public, currently-valid facts to content generation', async () => {
    await createFact({ factKey: 'active.public', isPublic: true });
    await createFact({ factKey: 'inactive.private', isPublic: false });
    await createFact({ factKey: 'expired', isPublic: true, expiresAt: new Date(Date.now() - 86400000) });

    const facts = await getActiveApprovedFacts();
    const keys = facts.map((f) => f.key);
    expect(keys).toContain('active.public');
    expect(keys).not.toContain('inactive.private');
    expect(keys).not.toContain('expired');
  });

  it('retiring a fact via the API excludes it from generation without deleting its history', async () => {
    const agent = await loginAs('founder@test.local');
    const fact = await createFact({ factKey: 'to.retire', isPublic: true });

    const res = await agent.delete(`/api/facts/${fact.id}`);
    expect(res.status).toBe(200);
    expect(res.body.fact.expiresAt).not.toBeNull();

    const stillExists = await prisma.marketingFact.findUnique({ where: { id: fact.id } });
    expect(stillExists).not.toBeNull();

    const active = await getActiveApprovedFacts();
    expect(active.map((f) => f.key)).not.toContain('to.retire');
  });
});

describe('consent withdrawal', () => {
  it('flags published drafts using a withdrawn consent for review, without deleting them', async () => {
    const agent = await loginAs('founder@test.local');
    const consent = await prisma.contentConsent.create({
      data: { subjectDescription: 'A tutor testimonial', scope: 'LinkedIn use', evidenceReference: 'signed-form-001' },
    });
    const asset = await prisma.mediaAsset.create({
      data: { filename: 'photo.jpg', storageKey: 'media/photo.jpg', mimeType: 'image/jpeg', kind: 'PHOTO', usageRights: 'Consented', consentId: consent.id },
    });
    const draft = await prisma.contentDraft.create({
      data: { contentType: 'SINGLE_IMAGE', body: 'A founding tutor story.', generationProvider: 'template', status: 'PUBLISHED', mediaAssetId: asset.id, publishedAt: new Date() },
    });

    const res = await agent.post(`/api/consents/${consent.id}/withdraw`);
    expect(res.status).toBe(200);
    expect(res.body.affectedPublished.map((d: { id: number }) => d.id)).toContain(draft.id);

    const stillPublished = await prisma.contentDraft.findUniqueOrThrow({ where: { id: draft.id } });
    expect(stillPublished.status).toBe('PUBLISHED'); // never auto-deleted, only flagged
  });
});
