import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

// These guards (config/env.ts's production checks, and prisma/_demo.ts's
// guardDemoCommand) run at module top-level and call process.exit() directly
// -- they can't be exercised in-process without killing the test runner, so
// each case is spawned as a real subprocess with controlled env vars. This is
// the one place in the suite that verifies "production never shows demo
// data/credentials" end-to-end rather than by code reading.

const apiRoot = path.resolve(__dirname, '..');

function runEnv(overrides: Record<string, string | undefined>) {
  const env: Record<string, string> = { ...process.env } as Record<string, string>;
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) delete env[k];
    else env[k] = v;
  }
  return spawnSync('npx', ['tsx', 'src/config/env.ts'], { cwd: apiRoot, env, encoding: 'utf8', shell: true });
}

const VALID_PROD_BASE = {
  APP_ENV: 'production',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/skillsplore_prod_check',
  SESSION_SECRET: 'a'.repeat(48),
  ENABLE_DEMO_LOGIN: '0',
  STORAGE_DRIVER: 'local',
};

describe('production boot guard (apps/api/src/config/env.ts)', () => {
  it('boots successfully with a genuinely secure production config', () => {
    const res = runEnv(VALID_PROD_BASE);
    expect(res.status).toBe(0);
  });

  it('refuses to boot in production with demo login enabled', () => {
    const res = runEnv({ ...VALID_PROD_BASE, ENABLE_DEMO_LOGIN: '1' });
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain('ENABLE_DEMO_LOGIN must be off in production');
  });

  it('refuses to boot in production with a known-insecure session secret', () => {
    const res = runEnv({ ...VALID_PROD_BASE, SESSION_SECRET: 'dev-only-insecure-session-secret-change-me' });
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain('SESSION_SECRET must be a unique random string');
  });

  it('refuses to boot in production with a session secret under 32 characters', () => {
    const res = runEnv({ ...VALID_PROD_BASE, SESSION_SECRET: 'short-secret' });
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain('SESSION_SECRET must be a unique random string');
  });

  it('refuses to boot in production with S3 storage but no credentials', () => {
    // Set to '' rather than deleting: env.ts's dotenv call would otherwise
    // refill a deleted key straight back from the repo's own local .env file,
    // which does have real S3 dev credentials in it. An explicitly present
    // '' is left alone by dotenv (it only fills in keys that are absent) and
    // is exactly the "not configured" case the guard is meant to catch.
    const res = runEnv({ ...VALID_PROD_BASE, STORAGE_DRIVER: 's3', S3_ACCESS_KEY: '', S3_SECRET_KEY: '', S3_ENDPOINT: '' });
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain('S3 storage in production requires');
  });

  it('does not apply the same strict checks outside production (demo login stays allowed in demo mode)', () => {
    const res = runEnv({ ...VALID_PROD_BASE, APP_ENV: 'demo', ENABLE_DEMO_LOGIN: '1', SESSION_SECRET: 'short' });
    expect(res.status).toBe(0);
  });
});

describe('demo command guard (apps/api/prisma/_demo.ts, via seed.ts/reset.ts/accounts.ts)', () => {
  function runDemoScript(script: 'seed' | 'reset' | 'accounts', appEnv: string) {
    const env: Record<string, string> = { ...process.env, APP_ENV: appEnv } as Record<string, string>;
    return spawnSync('npx', ['tsx', `prisma/${script}.ts`], { cwd: apiRoot, env, encoding: 'utf8', shell: true, timeout: 15000 });
  }

  it('demo:seed refuses to run when APP_ENV=production', () => {
    const res = runDemoScript('seed', 'production');
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain('Refusing to run "demo:seed"');
  });

  it('demo:reset refuses to run when APP_ENV=production', () => {
    const res = runDemoScript('reset', 'production');
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain('Refusing to run "demo:reset"');
  });

  it('demo:accounts refuses to run when APP_ENV=production', () => {
    const res = runDemoScript('accounts', 'production');
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain('Refusing to run "demo:accounts"');
  });
});
