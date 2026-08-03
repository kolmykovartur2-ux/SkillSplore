// Separate scheduler entrypoint (§30) — runs as its own process/container
// (docker-compose.yml's "worker" service), independent of the API process.
// Stopping this worker only pauses automatic publication; it never affects
// the API, the dashboard, or (obviously) the SkillSplore marketplace.
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { runSchedulerTick } from './modules/schedule/worker.service.js';

const TICK_INTERVAL_MS = 60_000;

async function tick() {
  try {
    const result = await runSchedulerTick();
    if (result.attempted > 0) {
      logger.info(result, 'scheduler tick complete');
    }
  } catch (err) {
    logger.error({ err }, 'scheduler tick failed');
  }
}

async function main() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    logger.error({ err }, 'Cannot reach the marketing-agent database.');
    process.exit(1);
  }

  logger.info(
    { autoPublish: env.AUTO_PUBLISH_APPROVED_POSTS, intervalMs: TICK_INTERVAL_MS },
    'SkillSplore marketing-agent scheduler worker started.' +
      (env.AUTO_PUBLISH_APPROVED_POSTS ? '' : ' AUTO_PUBLISH_APPROVED_POSTS is false — the worker will idle; use "publish now" manually.'),
  );

  const interval = setInterval(() => void tick(), TICK_INTERVAL_MS);
  void tick();

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'worker shutting down');
    clearInterval(interval);
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void main();
