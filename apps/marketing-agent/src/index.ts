import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';

async function main() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    logger.error({ err }, 'Cannot reach the marketing-agent database. Check DATABASE_URL and that PostgreSQL is running.');
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(env.API_PORT, () => {
    logger.info(
      {
        mode: env.APP_ENV,
        port: env.API_PORT,
        mockLinkedinApi: env.MOCK_LINKEDIN_API,
        contentAiProvider: env.CONTENT_AI_PROVIDER,
        autoPublish: env.AUTO_PUBLISH_APPROVED_POSTS,
      },
      `SkillSplore marketing-agent listening on port ${env.API_PORT} (${env.APP_ENV} mode). ` +
        `This is an optional subsystem — the SkillSplore marketplace does not depend on it.`,
    );
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutting down');
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void main();
