import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load .env from the repository root regardless of cwd.
const here = path.dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: path.resolve(here, '../../../../.env') });
loadDotenv(); // also allow a local .env next to cwd

const bool = (def: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined ? def : v === '1' || v.toLowerCase() === 'true'));

const schema = z.object({
  APP_ENV: z.enum(['development', 'demo', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  SESSION_SECRET: z.string().min(1, 'SESSION_SECRET is required'),
  FORCE_SECURE_COOKIES: bool(false),

  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_SECURE: bool(false),
  MAIL_FROM: z.string().default('SkillSplore <no-reply@skillsplore.local>'),

  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('./storage-data'),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().default('skillsplore'),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: bool(true),

  SHOW_DEMO_BANNER: bool(true),
  ENABLE_DEMO_LOGIN: bool(true),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),

  // Per-account brute-force lockout. Distinct from AUTH_RATE_LIMIT_MAX (which
  // is per-IP): this catches a distributed attack against one specific
  // account from many IPs, which IP-based rate limiting alone would miss.
  LOGIN_LOCKOUT_THRESHOLD: z.coerce.number().int().positive().default(8),
  LOGIN_LOCKOUT_MINUTES: z.coerce.number().int().positive().default(15),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  console.error(`\nInvalid environment configuration:\n${issues}\n`);
  process.exit(1);
}

const raw = parsed.data;

const isProduction = raw.APP_ENV === 'production';
const isDemo = raw.APP_ENV === 'demo';
const isDevelopment = raw.APP_ENV === 'development';

// ---------------------------------------------------------------------------
// Production safety guards. Production must never boot with demo shortcuts or
// insecure secrets. Safety is derived from APP_ENV, never from the hostname.
// ---------------------------------------------------------------------------
const INSECURE_SESSION_SECRETS = new Set([
  'dev-only-insecure-session-secret-change-me',
  'demo-compose-session-secret-change-for-any-real-use',
  'changeme',
  'secret',
]);

if (isProduction) {
  const failures: string[] = [];
  if (raw.ENABLE_DEMO_LOGIN) failures.push('ENABLE_DEMO_LOGIN must be off in production.');
  if (raw.SHOW_DEMO_BANNER) {
    // Not fatal, but forced off below. Warn loudly.
    console.warn('SHOW_DEMO_BANNER is ignored in production and forced off.');
  }
  if (INSECURE_SESSION_SECRETS.has(raw.SESSION_SECRET) || raw.SESSION_SECRET.length < 32) {
    failures.push('SESSION_SECRET must be a unique random string of at least 32 characters in production.');
  }
  if (raw.STORAGE_DRIVER === 's3' && (!raw.S3_ACCESS_KEY || !raw.S3_SECRET_KEY || !raw.S3_ENDPOINT)) {
    failures.push('S3 storage in production requires S3_ENDPOINT, S3_ACCESS_KEY and S3_SECRET_KEY.');
  }
  if (failures.length > 0) {
    console.error(
      `\nRefusing to start in production with insecure demonstration settings:\n` +
        failures.map((f) => `  - ${f}`).join('\n') +
        `\n`,
    );
    process.exit(1);
  }
}

export const env = {
  ...raw,
  // Derived, safety-corrected flags. Demo tooling is impossible in production.
  isProduction,
  isDemo,
  isDevelopment,
  demoLoginEnabled: raw.ENABLE_DEMO_LOGIN && !isProduction,
  demoToolsEnabled: !isProduction,
  showDemoBanner: raw.SHOW_DEMO_BANNER && !isProduction,
  secureCookies: isProduction || raw.FORCE_SECURE_COOKIES,
};

export type Env = typeof env;
