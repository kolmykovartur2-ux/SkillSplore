import supertest from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { hashPassword } from '../src/lib/password.js';

export const app = createApp();
export { prisma };

const PASSWORD = 'password12345';

// Ordered to respect foreign-key dependencies: children before parents.
export async function resetDb(): Promise<void> {
  await prisma.$transaction([
    prisma.postAnalytics.deleteMany(),
    prisma.publishedPost.deleteMany(),
    prisma.publicationAttempt.deleteMany(),
    prisma.contentApproval.deleteMany(),
    prisma.contentSchedule.deleteMany(),
    prisma.contentVersion.deleteMany(),
    prisma.generationRun.deleteMany(),
    prisma.contentDraft.deleteMany(),
    prisma.contentBrief.deleteMany(),
    prisma.contentIdea.deleteMany(),
    prisma.mediaAsset.deleteMany(),
    prisma.contentConsent.deleteMany(),
    prisma.contentCampaign.deleteMany(),
    prisma.contentPillar.deleteMany(),
    prisma.marketingFactSource.deleteMany(),
    prisma.marketingFact.deleteMany(),
    prisma.linkedinPermission.deleteMany(),
    prisma.linkedinOrganization.deleteMany(),
    prisma.linkedinConnection.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.generationProviderConfig.deleteMany(),
    prisma.adminUser.deleteMany(),
  ]);
}

export async function createAdmin(email = 'founder@test.local') {
  return prisma.adminUser.create({
    data: { email, passwordHash: await hashPassword(PASSWORD), displayName: 'Test Founder' },
  });
}

export async function loginAs(email: string) {
  const agent = supertest.agent(app);
  const res = await agent.post('/api/auth/login').send({ email, password: PASSWORD });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
}

export function anon() {
  return supertest(app);
}

export async function createPillar(name = 'Building SkillSplore', key = 'building-skillsplore') {
  return prisma.contentPillar.create({
    data: { key, name, description: 'Test pillar', targetPercentage: 25 },
  });
}

export async function createFact(
  overrides: Partial<{ factKey: string; value: string; isPublic: boolean; expiresAt: Date | null; validFrom: Date }> = {},
) {
  return prisma.marketingFact.create({
    data: {
      factKey: overrides.factKey ?? 'test.fact',
      value: overrides.value ?? 'Students use SkillSplore free of charge.',
      source: 'Test fixture',
      approvedBy: 'Test Founder',
      approvalDate: new Date(),
      isPublic: overrides.isPublic ?? true,
      expiresAt: overrides.expiresAt ?? null,
      // Pinned a minute in the past rather than left to the column's
      // `@default(now())`. That default is evaluated by the *database* clock
      // while getActiveApprovedFacts() filters with the *Node* clock, and the
      // two can differ by a few milliseconds — enough for a fact created and
      // read in the same instant to look as though it starts in the future.
      // Fixtures mean "a fact that is already active", so say so explicitly.
      validFrom: overrides.validFrom ?? new Date(Date.now() - 60_000),
    },
  });
}

export async function createBrief(pillarId?: number) {
  return prisma.contentBrief.create({
    data: {
      pillarId,
      objective: 'Test objective',
      audience: 'Test audience',
      mainIdea: 'Test main idea',
      productStage: 'Pre-launch',
      desiredReaderAction: 'Tell us what would make this useful',
      tone: 'Honest, modest, practical',
      format: 'TEXT_ONLY',
      maxLength: 1200,
    },
  });
}

export async function createDraft(overrides: Partial<{ briefId: number; status: 'AWAITING_REVIEW' | 'APPROVED' | 'SCHEDULED' | 'CHANGES_REQUESTED' | 'FAILED'; body: string }> = {}) {
  const draft = await prisma.contentDraft.create({
    data: {
      briefId: overrides.briefId,
      contentType: 'TEXT_ONLY',
      body: overrides.body ?? 'We are building SkillSplore, one honest update at a time.',
      generationProvider: 'template',
      status: overrides.status ?? 'AWAITING_REVIEW',
    },
  });
  await prisma.contentVersion.create({
    data: { draftId: draft.id, versionNumber: 1, content: draft.body, editorType: 'AI', changeSummary: 'Test fixture' },
  });
  return draft;
}
