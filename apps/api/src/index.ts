import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';

async function main() {
  // Fail fast if the database is unreachable at startup.
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    logger.error({ err }, 'Cannot reach the database. Check DATABASE_URL and that PostgreSQL is running.');
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(env.API_PORT, () => {
    logger.info(
      {
        mode: env.APP_ENV,
        port: env.API_PORT,
        demoLogin: env.demoLoginEnabled,
        demoBanner: env.showDemoBanner,
        storage: env.STORAGE_DRIVER,
        secureCookies: env.secureCookies,
      },
      `Learnfolk API listening on port ${env.API_PORT} (${env.APP_ENV} mode)`,
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
