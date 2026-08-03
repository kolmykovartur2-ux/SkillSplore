import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load this service's own .env — deliberately NOT the marketplace root .env.
// This service must never read the marketplace's secrets, and must remain
// fully configurable even if apps/api's .env doesn't exist at all.
const here = path.dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: path.resolve(here, '../../.env') });
loadDotenv(); // also allow a local .env next to cwd

const bool = (def: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined ? def : v === '1' || v.toLowerCase() === 'true'));

const schema = z.object({
  APP_ENV: z.enum(['development', 'demo', 'production']).default('development'),
  APP_URL: z.string().default('http://localhost:4100'),
  API_PORT: z.coerce.number().int().positive().default(4100),
  DASHBOARD_ORIGIN: z.string().default('http://localhost:5183'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  SESSION_SECRET: z.string().min(1, 'SESSION_SECRET is required'),
  // Reversible AES-256-GCM key for LinkedIn OAuth tokens (see lib/crypto.ts).
  // Distinct from SESSION_SECRET: sessions are one-way, tokens must be
  // decrypted again to call the LinkedIn API.
  TOKEN_ENCRYPTION_KEY: z.string().min(1, 'TOKEN_ENCRYPTION_KEY is required'),
  FORCE_SECURE_COOKIES: bool(false),

  // First-boot bootstrap for the single founder account. Only used when the
  // AdminUser table is empty; harmless to leave set afterwards. Plain
  // optional strings (not z.string().email()) so an empty "KEY=" line in
  // .env — the convention used throughout this file — parses cleanly
  // instead of failing strict email-format validation on an empty string.
  ADMIN_BOOTSTRAP_EMAIL: z.string().optional().default(''),
  ADMIN_BOOTSTRAP_PASSWORD: z.string().optional().default(''),

  // --- LinkedIn (Phase 6+; present now so config/docs are ready ahead of the
  // founder's own LinkedIn Developer app approval, per docs/marketing-agent/LINKEDIN_SETUP.md) ---
  LINKEDIN_CLIENT_ID: z.string().optional().default(''),
  LINKEDIN_CLIENT_SECRET: z.string().optional().default(''),
  LINKEDIN_REDIRECT_URI: z.string().optional().default(''),
  LINKEDIN_ORGANIZATION_URN: z.string().optional().default(''),
  LINKEDIN_API_VERSION: z.string().default('202405'),
  LINKEDIN_PUBLISHING_ENABLED: bool(false),
  // Demo/test double for the LinkedIn API. Must never be true in production
  // (§35) — enforced in the production guard below.
  MOCK_LINKEDIN_API: bool(true),

  // --- Content generation provider (sovereignty: swappable, defaults to no
  // network access at all) ---
  CONTENT_AI_PROVIDER: z.enum(['anthropic', 'openai_compatible', 'ollama', 'template']).default('template'),
  CONTENT_AI_API_KEY: z.string().optional().default(''),
  CONTENT_AI_MODEL: z.string().optional().default(''),
  OPENAI_COMPATIBLE_BASE_URL: z.string().optional().default(''),
  OLLAMA_BASE_URL: z.string().optional().default('http://localhost:11434'),

  DEFAULT_TIMEZONE: z.string().default('Pacific/Auckland'),
  // Only ever applies to already-*approved* content at its scheduled time —
  // never lets ungenerated/unapproved content publish (§7). Defaults to false:
  // the spec's own .env.example lists "true" as an *example*, but the spec
  // body is explicit that autonomous publication must not be the default, so
  // this codebase intentionally ships safer than that example value.
  AUTO_PUBLISH_APPROVED_POSTS: bool(false),

  // --- Object storage for media assets (local disk or any S3-compatible
  // endpoint — same adapter shape as apps/api/src/lib/storage.ts) ---
  OBJECT_STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
  OBJECT_STORAGE_LOCAL_DIR: z.string().default('./storage-data'),
  OBJECT_STORAGE_ENDPOINT: z.string().optional(),
  OBJECT_STORAGE_REGION: z.string().default('us-east-1'),
  OBJECT_STORAGE_BUCKET: z.string().default('skillsplore-marketing'),
  OBJECT_STORAGE_ACCESS_KEY: z.string().optional(),
  OBJECT_STORAGE_SECRET_KEY: z.string().optional(),

  // Launch configuration (§1) — content generation must never claim
  // categories/locations/stages beyond this.
  MARKETPLACE_LAUNCH_COUNTRY: z.string().default('NZ'),
  MARKETPLACE_LAUNCH_CITY: z.string().default('Auckland'),
  MARKETPLACE_LAUNCH_CATEGORY: z.string().default('Tutoring'),
  MARKETPLACE_LAUNCH_STAGE: z.string().default('Pre-launch'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),

  LOGIN_LOCKOUT_THRESHOLD: z.coerce.number().int().positive().default(8),
  LOGIN_LOCKOUT_MINUTES: z.coerce.number().int().positive().default(15),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  console.error(`\nInvalid marketing-agent environment configuration:\n${issues}\n`);
  process.exit(1);
}

const raw = parsed.data;

const isProduction = raw.APP_ENV === 'production';
const isDemo = raw.APP_ENV === 'demo';
const isDevelopment = raw.APP_ENV === 'development';

// ---------------------------------------------------------------------------
// Production safety guards, mirroring apps/api/src/config/env.ts exactly:
// safety is derived only from APP_ENV, and production refuses to boot with
// insecure or demo-only settings rather than silently degrading.
// ---------------------------------------------------------------------------
const INSECURE_SECRETS = new Set([
  'dev-only-insecure-session-secret-change-me',
  'test-only-session-secret-abcdefghijklmnopqrstuvwxyz',
  'test-only-token-encryption-key-abcdefghijklmnop',
  'changeme',
  'secret',
]);

if (isProduction) {
  const failures: string[] = [];
  if (INSECURE_SECRETS.has(raw.SESSION_SECRET) || raw.SESSION_SECRET.length < 32) {
    failures.push('SESSION_SECRET must be a unique random string of at least 32 characters in production.');
  }
  if (INSECURE_SECRETS.has(raw.TOKEN_ENCRYPTION_KEY) || raw.TOKEN_ENCRYPTION_KEY.length < 32) {
    failures.push('TOKEN_ENCRYPTION_KEY must be a unique random string of at least 32 characters in production.');
  }
  // Demonstration mode must never reach production (§35): a mock publish
  // pretending to post to real LinkedIn would be actively dangerous.
  if (raw.MOCK_LINKEDIN_API) {
    failures.push('MOCK_LINKEDIN_API must be false in production. Demo/mock publication is a development-only tool.');
  }
  if (raw.LINKEDIN_PUBLISHING_ENABLED && (!raw.LINKEDIN_CLIENT_ID || !raw.LINKEDIN_CLIENT_SECRET || !raw.LINKEDIN_REDIRECT_URI)) {
    failures.push('LINKEDIN_PUBLISHING_ENABLED requires LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET and LINKEDIN_REDIRECT_URI.');
  }
  if (raw.OBJECT_STORAGE_PROVIDER === 's3' && (!raw.OBJECT_STORAGE_ACCESS_KEY || !raw.OBJECT_STORAGE_SECRET_KEY || !raw.OBJECT_STORAGE_ENDPOINT)) {
    failures.push('S3 object storage in production requires OBJECT_STORAGE_ENDPOINT, OBJECT_STORAGE_ACCESS_KEY and OBJECT_STORAGE_SECRET_KEY.');
  }
  if (failures.length > 0) {
    console.error(
      `\nRefusing to start marketing-agent in production with insecure/demo settings:\n` +
        failures.map((f) => `  - ${f}`).join('\n') +
        `\n`,
    );
    process.exit(1);
  }
}

export const env = {
  ...raw,
  isProduction,
  isDemo,
  isDevelopment,
  secureCookies: isProduction || raw.FORCE_SECURE_COOKIES,
  // In this build (Phase 5), publishing always resolves through the mock
  // LinkedIn client — real Posts API publication is a documented Phase 6+
  // extension (docs/marketing-agent/KNOWN_LIMITATIONS.md).
  linkedinRealClientConfigured: Boolean(raw.LINKEDIN_CLIENT_ID && raw.LINKEDIN_CLIENT_SECRET),
};

export type Env = typeof env;
