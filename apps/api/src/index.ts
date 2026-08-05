import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { mailLooksUnconfigured } from './lib/mailer.js';

async function main() {
  // Fail fast if the database is unreachable at startup.
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    logger.error({ err }, 'Cannot reach the database. Check DATABASE_URL and that PostgreSQL is running.');
    process.exit(1);
  }

  // Production refuses to boot without a mail provider (see config/env.ts).
  // Outside production it starts anyway -- local development uses Mailpit on
  // localhost, and taking a running demo deployment offline over this would be
  // a worse outcome than running it degraded. But it must not be quiet about
  // it: with no mail server, email verification and password reset both fail,
  // and verification gates messaging.
  if (!env.isProduction && mailLooksUnconfigured() && !env.isDevelopment) {
    logger.warn(
      { smtpHost: env.SMTP_HOST },
      'NO MAIL SERVER CONFIGURED. Email verification and password reset will not work. '
      + 'Users can register but cannot verify, and verification is required to send messages. '
      + 'Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS and a real MAIL_FROM.',
    );
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
        mailConfigured: !mailLooksUnconfigured(),
      },
      `SkillSplore API listening on port ${env.API_PORT} (${env.APP_ENV} mode)`,
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
