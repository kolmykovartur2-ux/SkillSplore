import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../lib/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../lib/errors.js';
import { getLinkedinClient } from '../../lib/linkedin/index.js';

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth);

// §23 — analytics live in this service's own database, not only on
// LinkedIn. This reads what's already stored; it never calls LinkedIn live
// on every page load.
analyticsRouter.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const days = req.query.range === 'month' ? 30 : 7;
    const since = new Date(Date.now() - days * 86400000);
    const rows = await prisma.postAnalytics.findMany({
      where: { capturedAt: { gte: since } },
      include: { publishedPost: { include: { draft: { include: { campaign: true, brief: { include: { pillar: true } } } } } } },
      orderBy: { capturedAt: 'desc' },
    });
    const totals = rows.reduce(
      (acc, r) => {
        acc.impressions += r.impressions ?? 0;
        acc.reactions += r.reactions ?? 0;
        acc.comments += r.comments ?? 0;
        acc.shares += r.shares ?? 0;
        acc.clicks += r.clicks ?? 0;
        return acc;
      },
      { impressions: 0, reactions: 0, comments: 0, shares: 0, clicks: 0 },
    );
    res.json({ rangeDays: days, totals, rows, allSimulated: rows.length > 0 && rows.every((r) => r.isSimulated) });
  }),
);

analyticsRouter.post(
  '/published-posts/:id/sync',
  validate({ params: z.object({ id: z.coerce.number().int() }) }),
  asyncHandler(async (req, res) => {
    const publishedPost = await prisma.publishedPost.findUnique({
      where: { id: Number(req.params.id) },
      include: { draft: { include: { campaign: true, brief: { include: { pillar: true } } } } },
    });
    if (!publishedPost) throw notFound();
    const client = getLinkedinClient();
    const analytics = await client.fetchAnalytics(publishedPost.linkedinPostUrn);
    const row = await prisma.postAnalytics.create({
      data: {
        publishedPostId: publishedPost.id,
        ...analytics,
        postFormat: publishedPost.draft.contentType,
        contentPillarKey: publishedPost.draft.brief?.pillar?.key,
        campaignKey: publishedPost.draft.campaign?.key,
      },
    });
    await prisma.publishedPost.update({ where: { id: publishedPost.id }, data: { lastAnalyticsSyncAt: new Date() } });
    res.status(201).json({ analytics: row });
  }),
);
