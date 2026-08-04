import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAdmin, createBrief, createDraft, createPillar, loginAs, prisma, resetDb } from '../helpers.js';
import { env } from '../../src/config/env.js';
import { configuredImageProvider } from '../../src/lib/imageGenerationProvider.js';
import { IMAGE_SAFETY_CONSTRAINTS } from '../../src/lib/imagePrompt.js';

// A 1x1 PNG — enough to exercise the store-and-record path without depending
// on a real image model.
const FAKE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const originalConfigured = env.imageGenerationConfigured;

beforeEach(async () => {
  await resetDb();
  await createAdmin();
});

afterEach(() => {
  (env as { imageGenerationConfigured: boolean }).imageGenerationConfigured = originalConfigured;
  vi.restoreAllMocks();
});

describe('image generation availability', () => {
  // Pinned explicitly rather than relying on the ambient .env: a developer with
  // a provider configured locally would otherwise see these fail spuriously.
  beforeEach(() => {
    (env as { imageGenerationConfigured: boolean }).imageGenerationConfigured = false;
  });

  it('is off unless configured, and says how to turn it on rather than failing obscurely', async () => {
    const agent = await loginAs('founder@test.local');
    const res = await agent.post('/api/media/generate').send({ personaKey: 'chef' });

    expect(res.status).toBe(501);
    expect(res.body.error.code).toBe('not_configured');
    expect(res.body.error.message).toContain('IMAGE_AI_PROVIDER');
  });

  it('exposes the persona catalogue so the dashboard need not hard-code it', async () => {
    const agent = await loginAs('founder@test.local');
    const res = await agent.get('/api/media/personas');

    expect(res.status).toBe(200);
    expect(res.body.personas.length).toBeGreaterThan(0);
    expect(res.body.personas.map((p: { key: string }) => p.key)).toContain('electronics_teacher');
    expect(res.body.imageGenerationConfigured).toBe(false);
  });

  it('requires a session — generated creative is not an anonymous endpoint', async () => {
    const { anon } = await import('../helpers.js');
    const res = await anon().post('/api/media/generate').send({ personaKey: 'chef' });
    expect(res.status).toBe(401);
  });
});

describe('generating an image', () => {
  beforeEach(() => {
    (env as { imageGenerationConfigured: boolean }).imageGenerationConfigured = true;
  });

  it('stores the asset with full AI provenance and enforced usage rights', async () => {
    const spy = vi
      .spyOn(configuredImageProvider, 'generateImage')
      .mockResolvedValue({ bytes: FAKE_PNG, mimeType: 'image/png', model: 'test-model' });

    const agent = await loginAs('founder@test.local');
    const res = await agent.post('/api/media/generate').send({ personaKey: 'electronics_teacher', topic: 'after-work learning' });

    expect(res.status).toBe(201);
    const asset = await prisma.mediaAsset.findUniqueOrThrow({ where: { id: res.body.asset.id } });
    expect(asset.isAiGenerated).toBe(true);
    expect(asset.personaKey).toBe('electronics_teacher');
    expect(asset.generationModel).toBe('test-model');
    expect(asset.kind).toBe('POST_IMAGE');
    // Rights must record that this depicts nobody real — the whole point of
    // the provenance columns.
    expect(asset.usageRights).toContain('Depicts no real person');
    expect(asset.generationPrompt).toContain('electronics teacher');

    // The prompt actually sent must carry the safety constraints.
    const sent = spy.mock.calls[0]![0];
    for (const constraint of IMAGE_SAFETY_CONSTRAINTS) {
      expect(sent.prompt).toContain(constraint);
    }
  });

  it('records an audit entry', async () => {
    vi.spyOn(configuredImageProvider, 'generateImage').mockResolvedValue({ bytes: FAKE_PNG, mimeType: 'image/png' });

    const agent = await loginAs('founder@test.local');
    await agent.post('/api/media/generate').send({ personaKey: 'chef' });

    const entries = await prisma.auditLog.findMany({ where: { action: 'media.generate' } });
    expect(entries).toHaveLength(1);
  });

  it('rejects an unknown persona instead of prompting for something arbitrary', async () => {
    const spy = vi.spyOn(configuredImageProvider, 'generateImage');
    const agent = await loginAs('founder@test.local');

    const res = await agent.post('/api/media/generate').send({ personaKey: 'definitely-not-a-persona' });

    expect(res.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
    expect(await prisma.mediaAsset.count()).toBe(0);
  });

  it('surfaces the provider’s own error and stores nothing when generation fails', async () => {
    vi.spyOn(configuredImageProvider, 'generateImage').mockRejectedValue(new Error('content_policy_violation: refused'));

    const agent = await loginAs('founder@test.local');
    const res = await agent.post('/api/media/generate').send({ personaKey: 'chef' });

    expect(res.status).toBe(502);
    expect(res.body.error.message).toContain('content_policy_violation');
    // Not "linkedin_error": an image failure has nothing to do with LinkedIn,
    // and the shared 502 helper previously hard-coded that code.
    expect(res.body.error.code).toBe('image_generation_error');
    expect(await prisma.mediaAsset.count()).toBe(0);
  });
});

describe('generating an image for a specific draft', () => {
  beforeEach(() => {
    (env as { imageGenerationConfigured: boolean }).imageGenerationConfigured = true;
  });

  it('derives persona and mood from the draft’s own words, and attaches the result', async () => {
    const spy = vi
      .spyOn(configuredImageProvider, 'generateImage')
      .mockResolvedValue({ bytes: FAKE_PNG, mimeType: 'image/png', model: 'test-model' });
    const draft = await createDraft({
      body: 'We are looking for soldering and Arduino teachers to join as founding providers.',
    });

    const agent = await loginAs('founder@test.local');
    const res = await agent.post(`/api/drafts/${draft.id}/generate-image`).send({});

    expect(res.status).toBe(201);
    // Picked from the post text — not a default unrelated to the subject.
    expect(res.body.personaKey).toBe('electronics_teacher');
    const updated = await prisma.contentDraft.findUniqueOrThrow({ where: { id: draft.id } });
    expect(updated.mediaAssetId).toBe(res.body.asset.id);
    expect(spy.mock.calls[0]![0].prompt).toContain('electronics teacher');
  });

  it('uses the brief’s main idea as the mood when the draft has no title', async () => {
    const spy = vi.spyOn(configuredImageProvider, 'generateImage').mockResolvedValue({ bytes: FAKE_PNG, mimeType: 'image/png' });
    const pillar = await createPillar();
    const brief = await createBrief(pillar.id);
    const draft = await createDraft({ briefId: brief.id });

    const agent = await loginAs('founder@test.local');
    await agent.post(`/api/drafts/${draft.id}/generate-image`).send({});

    expect(spy.mock.calls[0]![0].prompt).toContain('Test main idea');
  });

  it('honours an explicit persona over the suggestion', async () => {
    const spy = vi.spyOn(configuredImageProvider, 'generateImage').mockResolvedValue({ bytes: FAKE_PNG, mimeType: 'image/png' });
    const draft = await createDraft({ body: 'A post about soldering and circuits.' });

    const agent = await loginAs('founder@test.local');
    const res = await agent.post(`/api/drafts/${draft.id}/generate-image`).send({ personaKey: 'chef' });

    expect(res.body.personaKey).toBe('chef');
    expect(spy.mock.calls[0]![0].prompt).toContain('chef');
  });

  // Swapping the creative changes what would actually be published, so the
  // reviewer's earlier approval no longer covers it.
  it('sends an approved draft back for reapproval and drops its schedule', async () => {
    vi.spyOn(configuredImageProvider, 'generateImage').mockResolvedValue({ bytes: FAKE_PNG, mimeType: 'image/png' });
    const draft = await createDraft({ status: 'APPROVED' });
    await prisma.contentDraft.update({
      where: { id: draft.id },
      data: { approvedBy: 1, approvedAt: new Date(), scheduledFor: new Date(Date.now() + 86400000) },
    });
    await prisma.contentSchedule.create({
      data: { draftId: draft.id, scheduledForUtc: new Date(Date.now() + 86400000), timezoneAtScheduling: 'Pacific/Auckland' },
    });

    const agent = await loginAs('founder@test.local');
    const res = await agent.post(`/api/drafts/${draft.id}/generate-image`).send({});

    expect(res.body.reapprovalRequired).toBe(true);
    const updated = await prisma.contentDraft.findUniqueOrThrow({ where: { id: draft.id } });
    expect(updated.status).toBe('CHANGES_REQUESTED');
    expect(updated.approvedAt).toBeNull();
    expect(updated.scheduledFor).toBeNull();
    expect(await prisma.contentSchedule.count({ where: { draftId: draft.id } })).toBe(0);
    const approvals = await prisma.contentApproval.findMany({ where: { draftId: draft.id, action: 'REAPPROVAL_REQUIRED' } });
    expect(approvals).toHaveLength(1);
  });

  it('leaves a draft awaiting review in that state', async () => {
    vi.spyOn(configuredImageProvider, 'generateImage').mockResolvedValue({ bytes: FAKE_PNG, mimeType: 'image/png' });
    const draft = await createDraft({ status: 'AWAITING_REVIEW' });

    const agent = await loginAs('founder@test.local');
    const res = await agent.post(`/api/drafts/${draft.id}/generate-image`).send({});

    expect(res.body.reapprovalRequired).toBe(false);
    const updated = await prisma.contentDraft.findUniqueOrThrow({ where: { id: draft.id } });
    expect(updated.status).toBe('AWAITING_REVIEW');
  });

  it('refuses once the draft is beyond editing, and stores nothing', async () => {
    const spy = vi.spyOn(configuredImageProvider, 'generateImage');
    const draft = await createDraft();
    await prisma.contentDraft.update({ where: { id: draft.id }, data: { status: 'PUBLISHED' } });

    const agent = await loginAs('founder@test.local');
    const res = await agent.post(`/api/drafts/${draft.id}/generate-image`).send({});

    expect(res.status).toBe(409);
    expect(spy).not.toHaveBeenCalled();
    expect(await prisma.mediaAsset.count()).toBe(0);
  });

  it('records the generation against the draft in the audit log', async () => {
    vi.spyOn(configuredImageProvider, 'generateImage').mockResolvedValue({ bytes: FAKE_PNG, mimeType: 'image/png' });
    const draft = await createDraft();

    const agent = await loginAs('founder@test.local');
    await agent.post(`/api/drafts/${draft.id}/generate-image`).send({});

    const entries = await prisma.auditLog.findMany({ where: { action: 'draft.generateImage' } });
    expect(entries).toHaveLength(1);
    expect(entries[0]!.entityId).toBe(draft.id);
  });
});
