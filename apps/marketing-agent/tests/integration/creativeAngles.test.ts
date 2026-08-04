import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAdmin, createBrief, createPillar, loginAs, prisma, resetDb } from '../helpers.js';
import { templateProvider } from '../../src/lib/providers/templateProvider.js';

beforeEach(async () => {
  await resetDb();
  await createAdmin();
});

describe('creative angles endpoint', () => {
  // '/creative-angles' sits above '/:id' in the router; if that order is ever
  // reversed Express parses "creative-angles" as an id and this 400s.
  it('is not shadowed by the /drafts/:id route', async () => {
    const agent = await loginAs('founder@test.local');
    const res = await agent.get('/api/drafts/creative-angles');

    expect(res.status).toBe(200);
    expect(res.body.angles.map((a: { key: string }) => a.key)).toContain('founder_story');
  });

  it('reports that template mode cannot act on an angle', async () => {
    const agent = await loginAs('founder@test.local');
    const res = await agent.get('/api/drafts/creative-angles');

    // The suite runs with CONTENT_AI_PROVIDER=template.
    expect(res.body.contentProvider).toBe('template');
    expect(res.body.anglesEffective).toBe(false);
  });
});

describe('generating with an angle', () => {
  it('passes the angle instruction through to the provider', async () => {
    const spy = vi.spyOn(templateProvider, 'generateVariants');
    const pillar = await createPillar();
    const brief = await createBrief(pillar.id);

    const agent = await loginAs('founder@test.local');
    const res = await agent.post('/api/drafts/generate').send({ briefId: brief.id, variantCount: 1, angleKey: 'founder_story' });

    expect(res.status).toBe(201);
    const passed = spy.mock.calls[0]![0];
    expect(passed.angleInstruction).toContain('Founder story');
    expect(passed.angleInstruction).toContain('further along');
    spy.mockRestore();
  });

  it('omits the instruction entirely when no angle is chosen', async () => {
    const spy = vi.spyOn(templateProvider, 'generateVariants');
    const pillar = await createPillar();
    const brief = await createBrief(pillar.id);

    const agent = await loginAs('founder@test.local');
    await agent.post('/api/drafts/generate').send({ briefId: brief.id, variantCount: 1 });

    expect(spy.mock.calls[0]![0].angleInstruction).toBeUndefined();
    spy.mockRestore();
  });

  it('rejects an unknown angle rather than silently ignoring it', async () => {
    const pillar = await createPillar();
    const brief = await createBrief(pillar.id);

    const agent = await loginAs('founder@test.local');
    const res = await agent.post('/api/drafts/generate').send({ briefId: brief.id, angleKey: 'not-an-angle' });

    expect(res.status).toBe(400);
    expect(await prisma.contentDraft.count()).toBe(0);
  });
});
