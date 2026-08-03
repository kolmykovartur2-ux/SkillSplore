import { beforeEach, describe, expect, it } from 'vitest';
import { createAdmin, createBrief, createDraft, createPillar, loginAs, prisma, resetDb } from '../helpers.js';

beforeEach(async () => {
  await resetDb();
  await createAdmin('founder@test.local');
});

describe('draft generation (template mode, no AI provider needed)', () => {
  it('generates drafts from a brief, storing an initial AI version', async () => {
    const agent = await loginAs('founder@test.local');
    const pillar = await createPillar();
    const brief = await createBrief(pillar.id);

    const res = await agent.post('/api/drafts/generate').send({ briefId: brief.id, variantCount: 2 });
    expect(res.status).toBe(201);
    expect(res.body.providerUsed).toBe('template');
    expect(res.body.drafts).toHaveLength(2);

    const draft = await prisma.contentDraft.findUniqueOrThrow({ where: { id: res.body.drafts[0].id }, include: { versions: true } });
    expect(draft.status).toBe('AWAITING_REVIEW');
    expect(draft.versions).toHaveLength(1);
    expect(draft.versions[0]!.editorType).toBe('AI');
  });
});

describe('approval gate', () => {
  it('cannot be scheduled before approval', async () => {
    const agent = await loginAs('founder@test.local');
    const draft = await createDraft({ status: 'AWAITING_REVIEW' });

    const res = await agent.post(`/api/schedule/drafts/${draft.id}/schedule`).send({ year: 2026, month: 6, day: 1, hour: 9, minute: 0 });
    expect(res.status).toBe(409);
  });

  it('can be scheduled once approved', async () => {
    const agent = await loginAs('founder@test.local');
    const draft = await createDraft({ status: 'AWAITING_REVIEW' });

    const approve = await agent.post(`/api/drafts/${draft.id}/approve`);
    expect(approve.status).toBe(200);
    expect(approve.body.draft.status).toBe('APPROVED');

    const schedule = await agent.post(`/api/schedule/drafts/${draft.id}/schedule`).send({ year: 2030, month: 6, day: 1, hour: 9, minute: 0 });
    expect(schedule.status).toBe(200);
    expect(schedule.body.draft.status).toBe('SCHEDULED');
  });

  it('editing an approved draft reverts it to changes_requested and requires reapproval', async () => {
    const agent = await loginAs('founder@test.local');
    const draft = await createDraft({ status: 'AWAITING_REVIEW' });
    await agent.post(`/api/drafts/${draft.id}/approve`);

    const edited = await agent.patch(`/api/drafts/${draft.id}`).send({ body: 'A materially different post body.' });
    expect(edited.status).toBe(200);
    expect(edited.body.draft.status).toBe('CHANGES_REQUESTED');

    const versions = await prisma.contentVersion.findMany({ where: { draftId: draft.id } });
    expect(versions).toHaveLength(2);
  });
});

describe('duplicate-publication prevention', () => {
  it('the atomic SCHEDULED->PUBLISHING claim only lets one caller through', async () => {
    const draft = await createDraft({ status: 'AWAITING_REVIEW' });
    await prisma.contentDraft.update({ where: { id: draft.id }, data: { status: 'APPROVED' } });
    await prisma.contentSchedule.create({
      data: { draftId: draft.id, scheduledForUtc: new Date(), timezoneAtScheduling: 'Pacific/Auckland' },
    });
    await prisma.contentDraft.update({ where: { id: draft.id }, data: { status: 'SCHEDULED' } });

    const { attemptPublish } = await import('../../src/modules/schedule/publish.service.js');
    const [first, second] = await Promise.all([attemptPublish(draft.id, null), attemptPublish(draft.id, null)]);
    const outcomes = [first.outcome, second.outcome].sort();
    // Exactly one call actually published; the other found nothing eligible to claim.
    expect(outcomes).toEqual(['already_in_progress_or_not_eligible', 'published']);

    const publishedPosts = await prisma.publishedPost.count({ where: { draftId: draft.id } });
    expect(publishedPosts).toBe(1);
  });

  it('publishes via the mock LinkedIn client and records isSimulated analytics', async () => {
    const draft = await createDraft({ status: 'AWAITING_REVIEW' });
    await prisma.contentDraft.update({ where: { id: draft.id }, data: { status: 'APPROVED' } });
    await prisma.contentSchedule.create({
      data: { draftId: draft.id, scheduledForUtc: new Date(), timezoneAtScheduling: 'Pacific/Auckland' },
    });
    await prisma.contentDraft.update({ where: { id: draft.id }, data: { status: 'SCHEDULED' } });

    const { attemptPublish } = await import('../../src/modules/schedule/publish.service.js');
    const result = await attemptPublish(draft.id, null);
    expect(result.outcome).toBe('published');

    const published = await prisma.contentDraft.findUniqueOrThrow({ where: { id: draft.id } });
    expect(published.status).toBe('PUBLISHED');

    const post = await prisma.publishedPost.findUniqueOrThrow({ where: { draftId: draft.id }, include: { analytics: true } });
    expect(post.linkedinPostUrn).toMatch(/^urn:li:share:/);
    expect(post.analytics[0]?.isSimulated).toBe(true);
  });
});
