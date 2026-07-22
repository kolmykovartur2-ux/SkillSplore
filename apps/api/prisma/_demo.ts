import { config as loadDotenv } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const here = path.dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: path.resolve(here, '../../../.env') });
loadDotenv();

export const prisma = new PrismaClient();

// Demo password is configurable but defaults to a clearly non-production value.
// These credentials only ever exist in development/demo databases: the guard
// below refuses to run any demo command when APP_ENV=production.
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'learnfolk-demo';

export const DEMO_ACCOUNTS = {
  admin: 'admin@demo.learnfolk.local',
  student: 'student@demo.learnfolk.local',
  tutor: 'tutor@demo.learnfolk.local',
  pending_tutor: 'pending.tutor@demo.learnfolk.local',
} as const;

// Refuses to touch a production database. Also refuses to run silently against
// an unknown database host without an explicit opt-in.
export function guardDemoCommand(commandName: string): void {
  const appEnv = process.env.APP_ENV ?? 'development';
  if (appEnv === 'production') {
    console.error(
      `\nRefusing to run "${commandName}" because APP_ENV=production.\n` +
        `Demonstration seeding and reset commands are disabled in production.\n`,
    );
    process.exit(1);
  }
  const url = process.env.DATABASE_URL ?? '';
  const host = safeHost(url);
  console.log(`\n[${commandName}] APP_ENV=${appEnv}`);
  console.log(`[${commandName}] Target database host: ${host || '(unknown)'}\n`);
  if (!host) {
    console.error('DATABASE_URL is not set or unparseable. Refusing to connect to an unknown database.');
    process.exit(1);
  }
}

function safeHost(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port || '5432'}${u.pathname}`;
  } catch {
    return '';
  }
}

export async function hash(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

// Deletes all application data in dependency-safe order. Used by reset + seed.
export async function truncateAll(): Promise<void> {
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.adminNote.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.report.deleteMany(),
    prisma.review.deleteMany(),
    prisma.engagement.deleteMany(),
    prisma.message.deleteMany(),
    prisma.conversationParticipant.deleteMany(),
    prisma.conversation.deleteMany(),
    prisma.requestResponse.deleteMany(),
    prisma.tutoringRequest.deleteMany(),
    prisma.savedTutor.deleteMany(),
    prisma.block.deleteMany(),
    prisma.availabilitySlot.deleteMany(),
    prisma.qualification.deleteMany(),
    prisma.tutorSubject.deleteMany(),
    prisma.tutorProfile.deleteMany(),
    prisma.emailToken.deleteMany(),
    prisma.subject.deleteMany(),
    prisma.category.deleteMany(),
    prisma.teachingLevel.deleteMany(),
    prisma.user.deleteMany(),
  ]);
  // The connect-pg-simple session table is managed outside Prisma; clear it too
  // so demo resets do not leave stale sessions behind.
  await prisma
    .$executeRawUnsafe(
      `DO $$ BEGIN IF to_regclass('public.user_sessions') IS NOT NULL THEN TRUNCATE TABLE user_sessions; END IF; END $$;`,
    )
    .catch(() => undefined);
}
