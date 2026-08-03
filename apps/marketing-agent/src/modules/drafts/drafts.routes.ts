import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../lib/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';
import { badRequest, conflict, notFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { withProviderFallback } from '../../lib/contentGenerationProvider.js';
import { getLaunchContext } from '../../lib/launch.js';
import { getActiveApprovedFacts } from '../../lib/facts.js';
import { evaluateDraftContent } from '../../lib/contentValidation.js';
import { addVersion, EDITABLE_STATUSES } from './drafts.service.js';

export const draftsRouter = Router();
draftsRouter.use(requireAuth);

const DRAFT_INCLUDE = {
  brief: { include: { pillar: true } },
  campaign: true,
  mediaAsset: true,
  versions: { orderBy: { versionNumber: 'desc' as const } },
  approvals: { orderBy: { createdAt: 'desc' as const } },
  schedule: true,
  publishedPost: { include: { analytics: true } },
  attempts: { orderBy: { attemptedAt: 'desc' as const } },
};

draftsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const status = req.query.status as string | undefined;
    const campaignId = req.query.campaignId ? Number(req.query.campaignId) : undefined;
    const drafts = await prisma.contentDraft.findMany({
      where: { status: status as never, campaignId },
      orderBy: { updatedAt: 'desc' },
      include: { brief: { include: { pillar: true } }, campaign: true, schedule: true },
    });
    res.json({ drafts });
  }),
);

// Review queue: everything awaiting a decision (§7, §17).
draftsRouter.get(
  '/review-queue',
  asyncHandler(async (_req, res) => {
    const drafts = await prisma.contentDraft.findMany({
      where: { status: { in: ['AWAITING_REVIEW', 'CHANGES_REQUESTED'] } },
      orderBy: { updatedAt: 'asc' },
      include: { brief: { include: { pillar: true } }, campaign: true },
    });
    res.json({ drafts });
  }),
);

draftsRouter.get(
  '/:id',
  validate({ params: z.object({ id: z.coerce.number().int() }) }),
  asyncHandler(async (req, res) => {
    const draft = await prisma.contentDraft.findUnique({ where: { id: Number(req.params.id) }, include: DRAFT_INCLUDE });
    if (!draft) throw notFound();
    res.json({ draft });
  }),
);

const generateSchema = z.object({ briefId: z.number().int(), variantCount: z.number().int().min(1).max(3).default(3) });

// §16 steps 1-13: brief -> approved facts only -> up to 3 variants -> stored
// as real drafts in AWAITING_REVIEW, never auto-approved.
draftsRouter.post(
  '/generate',
  validate({ body: generateSchema }),
  asyncHandler(async (req, res) => {
    const brief = await prisma.contentBrief.findUnique({ where: { id: req.body.briefId }, include: { pillar: true, idea: true } });
    if (!brief) throw notFound('Brief not found.');

    const facts = await getActiveApprovedFacts();
    const briefInput = {
      objective: brief.objective,
      audience: brief.audience,
      pillarName: brief.pillar?.name ?? 'Building SkillSplore',
      mainIdea: brief.mainIdea,
      productStage: brief.productStage,
      desiredReaderAction: brief.desiredReaderAction,
      tone: brief.tone,
      format: brief.format,
      maxLength: brief.maxLength,
      facts,
      launch: getLaunchContext(),
    };

    const { result: variants, providerUsed, fellBackToTemplate } = await withProviderFallback((provider) =>
      provider.generateVariants(briefInput, req.body.variantCount),
    );

    const createdDrafts = [];
    for (const variant of variants) {
      const draft = await prisma.contentDraft.create({
        data: {
          briefId: brief.id,
          campaignId: brief.idea?.campaignId ?? null,
          contentType: variant.contentType,
          body: variant.body,
          title: variant.title,
          generationProvider: providerUsed,
          generationModel: process.env.CONTENT_AI_MODEL || null,
          status: 'AWAITING_REVIEW',
          createdBy: req.adminUser!.id,
        },
      });
      const run = await prisma.generationRun.create({
        data: { draftId: draft.id, provider: providerUsed, model: process.env.CONTENT_AI_MODEL || null, promptSummary: brief.mainIdea, status: 'success' },
      });
      await addVersion({ draftId: draft.id, content: variant.body, editorType: 'AI', generationRunId: run.id, changeSummary: 'Initial AI generation' });
      createdDrafts.push(draft);
    }

    await writeAudit({
      actorId: req.adminUser!.id,
      action: 'draft.generate',
      entityType: 'ContentBrief',
      entityId: brief.id,
      metadata: { count: createdDrafts.length, providerUsed, fellBackToTemplate },
    });

    res.status(201).json({ drafts: createdDrafts, providerUsed, fellBackToTemplate });
  }),
);

draftsRouter.get(
  '/:id/evaluate',
  validate({ params: z.object({ id: z.coerce.number().int() }) }),
  asyncHandler(async (req, res) => {
    const draft = await prisma.contentDraft.findUnique({ where: { id: Number(req.params.id) }, include: { brief: true } });
    if (!draft) throw notFound();
    const recent = await prisma.contentDraft.findMany({
      where: { id: { not: draft.id }, status: { in: ['APPROVED', 'SCHEDULED', 'PUBLISHED'] } },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: { body: true },
    });
    const claims = Array.isArray(draft.brief?.claimsRequiringVerification) ? draft.brief!.claimsRequiringVerification : [];
    const warnings = evaluateDraftContent({
      body: draft.body,
      maxLength: draft.brief?.maxLength ?? 3000,
      hasUnverifiedClaims: claims.length === 0,
      recentDraftBodies: recent.map((d) => d.body),
    });
    res.json({ warnings });
  }),
);

const updateSchema = z.object({
  body: z.string().min(1).optional(),
  title: z.string().optional(),
  destinationUrl: z.string().url().optional(),
  changeSummary: z.string().optional(),
});

// §17: editing an already-approved (or scheduled) draft always requires
// reapproval. Nothing here silently rewrites the founder's own wording.
draftsRouter.patch(
  '/:id',
  validate({ body: updateSchema, params: z.object({ id: z.coerce.number().int() }) }),
  asyncHandler(async (req, res) => {
    const draft = await prisma.contentDraft.findUnique({ where: { id: Number(req.params.id) }, include: { schedule: true } });
    if (!draft) throw notFound();
    if (!EDITABLE_STATUSES.includes(draft.status as (typeof EDITABLE_STATUSES)[number])) {
      throw conflict(`Drafts with status ${draft.status} can no longer be edited.`);
    }

    const bodyChanged = req.body.body !== undefined && req.body.body !== draft.body;
    const wasApprovedOrScheduled = draft.status === 'APPROVED' || draft.status === 'SCHEDULED';

    const updated = await prisma.$transaction(async (tx) => {
      if (bodyChanged) {
        if (draft.schedule) await tx.contentSchedule.delete({ where: { draftId: draft.id } });
      }
      const next = await tx.contentDraft.update({
        where: { id: draft.id },
        data: {
          ...(req.body.body !== undefined ? { body: req.body.body } : {}),
          ...(req.body.title !== undefined ? { title: req.body.title } : {}),
          ...(req.body.destinationUrl !== undefined ? { destinationUrl: req.body.destinationUrl } : {}),
          ...(bodyChanged && wasApprovedOrScheduled
            ? { status: 'CHANGES_REQUESTED', approvedBy: null, approvedAt: null, scheduledFor: null }
            : {}),
        },
      });
      if (bodyChanged) {
        await addVersion(
          {
            draftId: draft.id,
            content: req.body.body!,
            editorType: 'HUMAN',
            editorUserId: req.adminUser!.id,
            changeSummary: req.body.changeSummary ?? 'Manual edit',
          },
          tx,
        );
        if (wasApprovedOrScheduled) {
          await tx.contentApproval.create({
            data: { draftId: draft.id, action: 'REAPPROVAL_REQUIRED', actorId: req.adminUser!.id, notes: 'Edited after approval; reapproval required.' },
          });
        }
      }
      return next;
    });

    await writeAudit({ actorId: req.adminUser!.id, action: 'draft.edit', entityType: 'ContentDraft', entityId: draft.id, metadata: { bodyChanged } });
    res.json({ draft: updated });
  }),
);

draftsRouter.post(
  '/:id/approve',
  validate({ params: z.object({ id: z.coerce.number().int() }) }),
  asyncHandler(async (req, res) => {
    const draft = await prisma.contentDraft.findUnique({ where: { id: Number(req.params.id) } });
    if (!draft) throw notFound();
    if (!['AWAITING_REVIEW', 'CHANGES_REQUESTED'].includes(draft.status)) {
      throw conflict(`Only drafts awaiting review can be approved (current status: ${draft.status}).`);
    }
    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.contentDraft.update({
        where: { id: draft.id },
        data: { status: 'APPROVED', approvedBy: req.adminUser!.id, approvedAt: new Date() },
      });
      await tx.contentApproval.create({ data: { draftId: draft.id, action: 'APPROVED', actorId: req.adminUser!.id } });
      return next;
    });
    await writeAudit({ actorId: req.adminUser!.id, action: 'draft.approve', entityType: 'ContentDraft', entityId: draft.id });
    res.json({ draft: updated });
  }),
);

const requestChangesSchema = z.object({ notes: z.string().min(1) });

draftsRouter.post(
  '/:id/request-changes',
  validate({ body: requestChangesSchema, params: z.object({ id: z.coerce.number().int() }) }),
  asyncHandler(async (req, res) => {
    const draft = await prisma.contentDraft.findUnique({ where: { id: Number(req.params.id) }, include: { schedule: true } });
    if (!draft) throw notFound();
    if (!['AWAITING_REVIEW', 'APPROVED', 'SCHEDULED'].includes(draft.status)) {
      throw conflict(`Cannot request changes on a draft with status ${draft.status}.`);
    }
    const updated = await prisma.$transaction(async (tx) => {
      if (draft.schedule) await tx.contentSchedule.delete({ where: { draftId: draft.id } });
      const next = await tx.contentDraft.update({
        where: { id: draft.id },
        data: { status: 'CHANGES_REQUESTED', approvedBy: null, approvedAt: null, scheduledFor: null },
      });
      await tx.contentApproval.create({ data: { draftId: draft.id, action: 'CHANGES_REQUESTED', actorId: req.adminUser!.id, notes: req.body.notes } });
      return next;
    });
    await writeAudit({ actorId: req.adminUser!.id, action: 'draft.request_changes', entityType: 'ContentDraft', entityId: draft.id, metadata: { notes: req.body.notes } });
    res.json({ draft: updated });
  }),
);

draftsRouter.post(
  '/:id/duplicate',
  validate({ params: z.object({ id: z.coerce.number().int() }) }),
  asyncHandler(async (req, res) => {
    const draft = await prisma.contentDraft.findUnique({ where: { id: Number(req.params.id) } });
    if (!draft) throw notFound();
    const copy = await prisma.contentDraft.create({
      data: {
        briefId: draft.briefId,
        campaignId: draft.campaignId,
        contentType: draft.contentType,
        body: draft.body,
        title: draft.title,
        generationProvider: draft.generationProvider,
        generationModel: draft.generationModel,
        status: 'DRAFT',
        createdBy: req.adminUser!.id,
      },
    });
    await addVersion({ draftId: copy.id, content: copy.body, editorType: 'HUMAN', editorUserId: req.adminUser!.id, changeSummary: `Duplicated from draft #${draft.id}` });
    await writeAudit({ actorId: req.adminUser!.id, action: 'draft.duplicate', entityType: 'ContentDraft', entityId: copy.id, metadata: { sourceDraftId: draft.id } });
    res.status(201).json({ draft: copy });
  }),
);

draftsRouter.post(
  '/:id/cancel',
  validate({ params: z.object({ id: z.coerce.number().int() }) }),
  asyncHandler(async (req, res) => {
    const draft = await prisma.contentDraft.findUnique({ where: { id: Number(req.params.id) }, include: { schedule: true } });
    if (!draft) throw notFound();
    if (['PUBLISHED', 'PUBLISHING'].includes(draft.status)) throw conflict('Published content cannot be cancelled — archive it instead.');
    await prisma.$transaction(async (tx) => {
      if (draft.schedule) await tx.contentSchedule.delete({ where: { draftId: draft.id } });
      await tx.contentDraft.update({ where: { id: draft.id }, data: { status: 'CANCELLED', scheduledFor: null } });
    });
    await writeAudit({ actorId: req.adminUser!.id, action: 'draft.cancel', entityType: 'ContentDraft', entityId: draft.id });
    res.json({ ok: true });
  }),
);

draftsRouter.post(
  '/:id/archive',
  validate({ params: z.object({ id: z.coerce.number().int() }) }),
  asyncHandler(async (req, res) => {
    const draft = await prisma.contentDraft.findUnique({ where: { id: Number(req.params.id) } });
    if (!draft) throw notFound();
    if (!['PUBLISHED', 'CANCELLED', 'FAILED'].includes(draft.status)) {
      throw badRequest('Only published, cancelled or failed content can be archived.');
    }
    const updated = await prisma.contentDraft.update({ where: { id: draft.id }, data: { status: 'ARCHIVED' } });
    await writeAudit({ actorId: req.adminUser!.id, action: 'draft.archive', entityType: 'ContentDraft', entityId: draft.id });
    res.json({ draft: updated });
  }),
);
