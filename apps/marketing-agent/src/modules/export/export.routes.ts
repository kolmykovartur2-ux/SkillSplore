import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';
import { toCsv } from '../../lib/csv.js';
import { writeAudit } from '../../lib/audit.js';

export const exportRouter = Router();
exportRouter.use(requireAuth);

// §29 — portability: everything this service holds can be exported as JSON
// (or CSV for the flat tables), independent of any hosting provider.
exportRouter.get(
  '/all.json',
  asyncHandler(async (req, res) => {
    const [drafts, campaigns, pillars, facts, media, consents, publishedPosts, analytics, auditLogs] = await Promise.all([
      prisma.contentDraft.findMany({ include: { versions: true, approvals: true, schedule: true } }),
      prisma.contentCampaign.findMany(),
      prisma.contentPillar.findMany(),
      prisma.marketingFact.findMany({ include: { sources: true } }),
      prisma.mediaAsset.findMany(),
      prisma.contentConsent.findMany(),
      prisma.publishedPost.findMany(),
      prisma.postAnalytics.findMany(),
      prisma.auditLog.findMany(),
    ]);
    await writeAudit({ actorId: req.adminUser!.id, action: 'export.all', metadata: { format: 'json' } });
    res.setHeader('content-disposition', 'attachment; filename="skillsplore-marketing-export.json"');
    res.json({
      exportedAt: new Date().toISOString(),
      drafts,
      campaigns,
      pillars,
      facts,
      media,
      consents,
      publishedPosts,
      analytics,
      auditLogs,
    });
  }),
);

exportRouter.get(
  '/drafts.csv',
  asyncHandler(async (req, res) => {
    const drafts = await prisma.contentDraft.findMany({
      select: { id: true, status: true, contentType: true, generationProvider: true, createdAt: true, scheduledFor: true, publishedAt: true, campaignId: true, briefId: true },
    });
    await writeAudit({ actorId: req.adminUser!.id, action: 'export.drafts', metadata: { format: 'csv' } });
    res.setHeader('content-type', 'text/csv');
    res.setHeader('content-disposition', 'attachment; filename="drafts.csv"');
    res.send(toCsv(drafts));
  }),
);

exportRouter.get(
  '/analytics.csv',
  asyncHandler(async (req, res) => {
    const rows = await prisma.postAnalytics.findMany();
    await writeAudit({ actorId: req.adminUser!.id, action: 'export.analytics', metadata: { format: 'csv' } });
    res.setHeader('content-type', 'text/csv');
    res.setHeader('content-disposition', 'attachment; filename="analytics.csv"');
    res.send(toCsv(rows));
  }),
);
