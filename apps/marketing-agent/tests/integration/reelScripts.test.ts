import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAdmin, createBrief, createPillar, loginAs, prisma, resetDb } from '../helpers.js';
import { templateProvider } from '../../src/lib/providers/templateProvider.js';

beforeEach(async () => {
  await resetDb();
  await createAdmin();
});

async function brief() {
  const pillar = await createPillar();
  return createBrief(pillar.id);
}

describe('reel formats endpoint', () => {
  // Same route-shadowing trap as /creative-angles.
  it('is not shadowed by the /drafts/:id route', async () => {
    const agent = await loginAs('founder@test.local');
    const res = await agent.get('/api/drafts/reel-formats');

    expect(res.status).toBe(200);
    expect(res.body.formats.map((f: { key: string }) => f.key)).toContain('linkedin_video');
  });

  it('warns that template mode yields a scaffold rather than written copy', async () => {
    const agent = await loginAs('founder@test.local');
    const res = await agent.get('/api/drafts/reel-formats');
    expect(res.body.scriptsEffective).toBe(false);
  });
});

describe('generating reel scripts', () => {
  it('creates one reviewable draft per requested platform', async () => {
    const b = await brief();
    const agent = await loginAs('founder@test.local');

    const res = await agent
      .post('/api/drafts/generate-reel')
      .send({ briefId: b.id, platformKeys: ['linkedin_video', 'reels_shortform'] });

    expect(res.status).toBe(201);
    expect(res.body.drafts).toHaveLength(2);

    const drafts = await prisma.contentDraft.findMany({ orderBy: { id: 'asc' } });
    expect(drafts.map((d) => d.contentType)).toEqual(['NATIVE_VIDEO_BRIEF', 'NATIVE_VIDEO_BRIEF']);
    // Never auto-approved — scripts go through the same gate as written posts.
    expect(drafts.every((d) => d.status === 'AWAITING_REVIEW')).toBe(true);
    expect(drafts[0]!.title).toContain('LinkedIn native video');
    expect(drafts[1]!.title).toContain('Instagram Reels');
  });

  it('stores a filmable shot list as the draft body', async () => {
    const b = await brief();
    const agent = await loginAs('founder@test.local');
    await agent.post('/api/drafts/generate-reel').send({ briefId: b.id, platformKeys: ['reels_shortform'] });

    const draft = await prisma.contentDraft.findFirstOrThrow();
    expect(draft.body).toContain('HOOK');
    expect(draft.body).toContain('SHOT LIST:');
    expect(draft.body).toContain('CAPTION:');
  });

  it('records an initial version so the script is editable like any other draft', async () => {
    const b = await brief();
    const agent = await loginAs('founder@test.local');
    await agent.post('/api/drafts/generate-reel').send({ briefId: b.id, platformKeys: ['linkedin_video'] });

    const draft = await prisma.contentDraft.findFirstOrThrow();
    const versions = await prisma.contentVersion.findMany({ where: { draftId: draft.id } });
    expect(versions).toHaveLength(1);
    expect(versions[0]!.editorType).toBe('AI');
  });

  it('passes the platform constraints and the chosen angle to the provider', async () => {
    const spy = vi.spyOn(templateProvider, 'generateShortFormScript');
    const b = await brief();
    const agent = await loginAs('founder@test.local');

    await agent
      .post('/api/drafts/generate-reel')
      .send({ briefId: b.id, platformKeys: ['reels_shortform'], angleKey: 'founder_story' });

    const passed = spy.mock.calls[0]![0];
    expect(passed.platformKey).toBe('reels_shortform');
    expect(passed.formatInstruction).toContain('9:16');
    expect(passed.formatInstruction).toMatch(/fabricated testimonial/);
    expect(passed.angleInstruction).toContain('Founder story');
    spy.mockRestore();
  });

  it('rejects an unknown platform and creates nothing', async () => {
    const b = await brief();
    const agent = await loginAs('founder@test.local');

    const res = await agent.post('/api/drafts/generate-reel').send({ briefId: b.id, platformKeys: ['myspace'] });

    expect(res.status).toBe(400);
    expect(await prisma.contentDraft.count()).toBe(0);
  });

  it('requires at least one platform', async () => {
    const b = await brief();
    const agent = await loginAs('founder@test.local');
    const res = await agent.post('/api/drafts/generate-reel').send({ briefId: b.id, platformKeys: [] });
    expect(res.status).toBe(400);
  });

  it('records the generation in the audit log', async () => {
    const b = await brief();
    const agent = await loginAs('founder@test.local');
    await agent.post('/api/drafts/generate-reel').send({ briefId: b.id, platformKeys: ['linkedin_video'] });

    const entries = await prisma.auditLog.findMany({ where: { action: 'draft.generateReel' } });
    expect(entries).toHaveLength(1);
  });
});
