// Demo/first-boot seed: founder account, the six content pillars (§9), the
// four initial campaigns (§21), a handful of approved launch facts (§13),
// and the twelve-post launch calendar (§22) as real stored drafts —
// generated with the deterministic template provider so this seed never
// needs an AI provider or network access. Everything lands in
// AWAITING_REVIEW; nothing is auto-approved or auto-scheduled (§7, §22).
import { prisma } from '../src/lib/prisma.js';
import { hashPassword } from '../src/lib/password.js';
import { env } from '../src/config/env.js';
import { templateProvider } from '../src/lib/providers/templateProvider.js';
import type { BriefInput } from '../src/lib/contentGenerationProvider.js';

async function seedAdmin() {
  const email = (env.ADMIN_BOOTSTRAP_EMAIL || 'founder@skillsplore.local').toLowerCase();
  const password = env.ADMIN_BOOTSTRAP_PASSWORD || 'skillsplore-marketing-demo';
  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) return existing;
  const admin = await prisma.adminUser.create({
    data: { email, passwordHash: await hashPassword(password), displayName: 'Artur Kolmykov' },
  });
  if (!env.ADMIN_BOOTSTRAP_EMAIL || !env.ADMIN_BOOTSTRAP_PASSWORD) {
    console.warn(
      `\nNo ADMIN_BOOTSTRAP_EMAIL/ADMIN_BOOTSTRAP_PASSWORD set — created a DEMO-ONLY account:\n  ${email} / ${password}\nChange this before any real deployment.\n`,
    );
  }
  return admin;
}

// §9 — six pillars. The suggested distribution percentages in §9 (25/20/20/
// 15/15/5) are given against a slightly different 6-item breakdown than this
// pillar list's own names; this mapping keeps the same *shape* (building
// gets the largest share, direct-promotion content stays smallest) applied
// to the pillar list actually named in §9.
const PILLARS = [
  { key: 'building-skillsplore', name: 'Building SkillSplore', description: 'Founder journey, honest progress updates, product decisions.', targetPercentage: 25 },
  { key: 'problems-finding-help', name: 'Problems in finding specialised help', description: 'Why finding the right specialist is hard today, and why ordinary directories fall short.', targetPercentage: 10 },
  { key: 'advice-for-customers', name: 'Advice for customers', description: 'How to write a useful request, compare providers, and use SkillSplore well.', targetPercentage: 20 },
  { key: 'advice-for-providers', name: 'Advice for providers', description: 'Profile-building guidance, pricing, and what the approval process does and does not mean.', targetPercentage: 20 },
  { key: 'product-demonstrations', name: 'Product demonstrations', description: 'Real walkthroughs of search, requests, profiles, and messaging.', targetPercentage: 15 },
  { key: 'founding-community-recruitment', name: 'Founding-community recruitment', description: 'Calling founding tutors and early students; explaining pilot participation.', targetPercentage: 10 },
];

const CAMPAIGNS = [
  { key: 'why-skillsplore', name: 'Why SkillSplore', goal: 'Explain the problem and product model.' },
  { key: 'founding-tutors', name: 'Founding tutors', goal: 'Recruit 20–50 credible early tutors.' },
  { key: 'early-students', name: 'Early students', goal: 'Obtain the first ten genuine tutoring requests.' },
  { key: 'building-openly', name: 'Building openly', goal: 'Build trust by documenting progress honestly.' },
];

async function seedPillarsAndCampaigns() {
  for (const p of PILLARS) {
    await prisma.contentPillar.upsert({ where: { key: p.key }, update: {}, create: p });
  }
  for (const c of CAMPAIGNS) {
    await prisma.contentCampaign.upsert({ where: { key: c.key }, update: {}, create: { ...c, status: 'ACTIVE' } });
  }
}

async function seedFacts(approvedBy: string) {
  const now = new Date();
  const facts = [
    {
      factKey: 'launch.focus',
      value: `SkillSplore's initial launch focus is ${env.MARKETPLACE_LAUNCH_CATEGORY.toLowerCase()} in ${env.MARKETPLACE_LAUNCH_CITY} and online across ${env.MARKETPLACE_LAUNCH_COUNTRY === 'NZ' ? 'New Zealand' : env.MARKETPLACE_LAUNCH_COUNTRY}.`,
      source: 'Founder configuration (MARKETPLACE_LAUNCH_* settings)',
    },
    { factKey: 'pricing.provider_rates', value: 'Providers set their own rates on SkillSplore.', source: 'Product design decision' },
    { factKey: 'pricing.student_cost', value: 'Students use SkillSplore free of charge.', source: 'Product pricing decision' },
    { factKey: 'stage.current', value: `SkillSplore is currently ${env.MARKETPLACE_LAUNCH_STAGE.toLowerCase()} — building and testing the first version.`, source: 'Founder' },
  ];
  for (const f of facts) {
    await prisma.marketingFact.upsert({
      where: { factKey: f.factKey },
      update: {},
      create: { ...f, approvedBy, approvalDate: now, isPublic: true, containsPersonalInfo: false },
    });
  }
}

interface LaunchTopic {
  pillarKey: string;
  objective: string;
  audience: string;
  mainIdea: string;
  desiredReaderAction: string;
}

function launchTopics(): LaunchTopic[] {
  return [
    { pillarKey: 'building-skillsplore', objective: 'Introduce why SkillSplore is being built', audience: 'Anyone following the build', mainIdea: 'Why SkillSplore is being built', desiredReaderAction: 'Follow along and share feedback' },
    { pillarKey: 'advice-for-customers', objective: 'Explain the product model', audience: 'Prospective students and parents', mainIdea: 'The difference between searching directly and posting a request', desiredReaderAction: 'Try posting a request' },
    { pillarKey: 'founding-community-recruitment', objective: 'Recruit founding tutors', audience: 'Tutors considering SkillSplore', mainIdea: 'A call for founding tutors', desiredReaderAction: 'Apply to create an early provider profile' },
    { pillarKey: 'advice-for-providers', objective: 'Explain provider pricing', audience: 'Tutors and providers', mainIdea: 'How tutors set their own prices on SkillSplore', desiredReaderAction: 'Apply to become a founding provider' },
    { pillarKey: 'product-demonstrations', objective: 'Show the current product', audience: 'Followers curious about the product', mainIdea: 'A walkthrough of the current search and profile experience', desiredReaderAction: 'Try the feature and share feedback' },
    { pillarKey: 'advice-for-customers', objective: 'Help students write better requests', audience: 'Students and parents', mainIdea: 'What makes a useful student request', desiredReaderAction: 'Try posting a request' },
    { pillarKey: 'advice-for-providers', objective: 'Start a discussion with tutors', audience: 'Tutors and providers', mainIdea: 'A question for tutors about how they currently find students', desiredReaderAction: 'Tell us what would make this useful' },
    { pillarKey: 'advice-for-customers', objective: 'Explain trust beyond price', audience: 'Students and parents', mainIdea: 'Why price should not be the only way to compare providers', desiredReaderAction: 'Try posting a request' },
    { pillarKey: 'advice-for-customers', objective: 'Recruit early students', audience: 'Students needing specialist subjects', mainIdea: 'A call for students who need help with hard-to-find subjects', desiredReaderAction: 'Try posting a request' },
    { pillarKey: 'building-skillsplore', objective: 'Share an honest update', audience: 'Anyone following the build', mainIdea: 'An honest development update, including what has not worked yet', desiredReaderAction: 'Tell us what would make this useful' },
    { pillarKey: 'advice-for-providers', objective: 'Explain profile approval', audience: 'Tutors and providers', mainIdea: 'How profile approval differs from verification, and what it does not mean', desiredReaderAction: 'Apply to become a founding provider' },
    { pillarKey: 'building-skillsplore', objective: 'Share what is being tested next', audience: 'Anyone following the build', mainIdea: 'What SkillSplore is testing next', desiredReaderAction: 'Follow SkillSplore as we build the first version' },
  ];
}

async function seedLaunchCalendar(createdBy: number) {
  const existingCount = await prisma.contentDraft.count();
  if (existingCount > 0) return; // idempotent: don't duplicate on repeat seeding

  const pillars = await prisma.contentPillar.findMany();
  const pillarByKey = new Map(pillars.map((p) => [p.key, p]));
  const facts = await prisma.marketingFact.findMany({ where: { isPublic: true } });
  const factRefs = facts.map((f) => ({ key: f.factKey, value: f.value, source: f.source }));
  const launch = {
    country: env.MARKETPLACE_LAUNCH_COUNTRY,
    city: env.MARKETPLACE_LAUNCH_CITY,
    category: env.MARKETPLACE_LAUNCH_CATEGORY,
    stage: env.MARKETPLACE_LAUNCH_STAGE,
  };

  for (const topic of launchTopics()) {
    const pillar = pillarByKey.get(topic.pillarKey);
    const brief = await prisma.contentBrief.create({
      data: {
        pillarId: pillar?.id,
        objective: topic.objective,
        audience: topic.audience,
        mainIdea: topic.mainIdea,
        productStage: launch.stage,
        desiredReaderAction: topic.desiredReaderAction,
        tone: 'Honest, modest, practical',
        format: 'TEXT_ONLY',
        maxLength: 1200,
        createdBy,
      },
    });

    const briefInput: BriefInput = {
      objective: brief.objective,
      audience: brief.audience,
      pillarName: pillar?.name ?? 'Building SkillSplore',
      mainIdea: brief.mainIdea,
      productStage: brief.productStage,
      desiredReaderAction: brief.desiredReaderAction,
      tone: brief.tone,
      format: brief.format,
      maxLength: brief.maxLength,
      facts: factRefs,
      launch,
    };
    const generated = await templateProvider.generatePostDraft(briefInput);

    const draft = await prisma.contentDraft.create({
      data: {
        briefId: brief.id,
        contentType: generated.contentType,
        body: generated.body,
        title: generated.title,
        generationProvider: 'template',
        status: 'AWAITING_REVIEW',
        createdBy,
      },
    });
    const run = await prisma.generationRun.create({
      data: { draftId: draft.id, provider: 'template', promptSummary: topic.mainIdea, status: 'success' },
    });
    await prisma.contentVersion.create({
      data: { draftId: draft.id, versionNumber: 1, content: generated.body, editorType: 'AI', generationRunId: run.id, changeSummary: 'Launch-calendar seed' },
    });
    await prisma.contentDraft.update({ where: { id: draft.id }, data: { currentVersionId: (await prisma.contentVersion.findFirstOrThrow({ where: { draftId: draft.id } })).id } });
  }
}

async function main() {
  const admin = await seedAdmin();
  await seedPillarsAndCampaigns();
  await seedFacts(admin.displayName);
  await seedLaunchCalendar(admin.id);
  console.log('Marketing-agent demo seed complete: founder account, 6 pillars, 4 campaigns, approved facts, and the 12-post launch calendar (all awaiting_review).');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
