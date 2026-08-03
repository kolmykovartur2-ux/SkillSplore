import { Router } from 'express';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { pillarsRouter } from './modules/pillars/pillars.routes.js';
import { campaignsRouter } from './modules/campaigns/campaigns.routes.js';
import { ideasRouter } from './modules/ideas/ideas.routes.js';
import { briefsRouter } from './modules/briefs/briefs.routes.js';
import { draftsRouter } from './modules/drafts/drafts.routes.js';
import { scheduleRouter } from './modules/schedule/schedule.routes.js';
import { factsRouter } from './modules/facts/facts.routes.js';
import { consentsRouter } from './modules/consents/consents.routes.js';
import { mediaRouter } from './modules/media/media.routes.js';
import { linkedinConnectionRouter } from './modules/linkedinConnection/linkedinConnection.routes.js';
import { analyticsRouter } from './modules/analytics/analytics.routes.js';
import { auditLogRouter } from './modules/auditLog/auditLog.routes.js';
import { exportRouter } from './modules/export/export.routes.js';

export const apiRouter = Router();

// Public runtime config the dashboard reads on boot. Never leaks secrets.
apiRouter.get('/config', (_req, res) => {
  res.json({
    appEnv: env.APP_ENV,
    defaultTimezone: env.DEFAULT_TIMEZONE,
    mockLinkedinApi: env.MOCK_LINKEDIN_API,
    contentAiProvider: env.CONTENT_AI_PROVIDER,
    launch: {
      country: env.MARKETPLACE_LAUNCH_COUNTRY,
      city: env.MARKETPLACE_LAUNCH_CITY,
      category: env.MARKETPLACE_LAUNCH_CATEGORY,
      stage: env.MARKETPLACE_LAUNCH_STAGE,
    },
  });
});

// Same {status, appEnv} / 503 contract as apps/api's /api/health, so this
// service is monitorable the same way — but it is a *separate* health check;
// nothing ever aggregates the two services' health into one signal, because
// that would itself be a hidden runtime dependency between them.
apiRouter.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', appEnv: env.APP_ENV });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'unreachable' });
  }
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/pillars', pillarsRouter);
apiRouter.use('/campaigns', campaignsRouter);
apiRouter.use('/ideas', ideasRouter);
apiRouter.use('/briefs', briefsRouter);
apiRouter.use('/drafts', draftsRouter);
apiRouter.use('/schedule', scheduleRouter);
apiRouter.use('/facts', factsRouter);
apiRouter.use('/consents', consentsRouter);
apiRouter.use('/media', mediaRouter);
apiRouter.use('/linkedin', linkedinConnectionRouter);
apiRouter.use('/analytics', analyticsRouter);
apiRouter.use('/audit-log', auditLogRouter);
apiRouter.use('/export', exportRouter);
