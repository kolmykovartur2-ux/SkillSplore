import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against a genuinely running stack: real API, real database,
 * real browser input.
 *
 * The API suite covers permissions and business rules well, but everything
 * between a real click and those endpoints was untested, which is exactly where
 * a bug like the homepage category links (a query-string key mismatch) hid.
 *
 * Uses its own database (skillsplore_e2e) so a run never touches demo or
 * development data, and its own ports so it can run alongside a dev server.
 */
const API_PORT = 4100;
const WEB_PORT = 5273;
const DATABASE_URL = process.env.E2E_DATABASE_URL
  ?? 'postgresql://skillsplore:skillsplore@localhost:5432/skillsplore_e2e?schema=public';

// Names must match the zod schema in apps/api/src/config/env.ts exactly; an
// unrecognised name is silently ignored and the default applies instead.
const apiEnv = {
  APP_ENV: 'demo',
  DATABASE_URL,
  API_PORT: String(API_PORT),
  WEB_ORIGIN: `http://localhost:${WEB_PORT}`,
  SESSION_SECRET: 'e2e-only-session-secret-abcdefghijklmnopqrstuvwxyz',
  STORAGE_DRIVER: 'local',
  STORAGE_LOCAL_DIR: './storage-e2e',
  // Demo login is what several of these tests exercise, and demo mode is the
  // closest match to how the public demo actually runs.
  ENABLE_DEMO_LOGIN: 'true',
  SHOW_DEMO_BANNER: 'false',
  // The suite signs in far more often than a person would, and both projects
  // share one server, so the production defaults (300 requests / 20 auth
  // attempts per 15 minutes) throttle it partway through. That surfaced as a
  // blank category grid and failed logins rather than an obvious 429. Rate
  // limiting is worth testing deliberately, not as a flaky side effect here.
  RATE_LIMIT_MAX: '100000',
  AUTH_RATE_LIMIT_MAX: '100000',
  LOGIN_LOCKOUT_THRESHOLD: '1000',
};

export default defineConfig({
  testDir: './e2e',
  // Shared server and one database: parallel workers would race on state.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    // The nav collapse and single-column layouts only exist below 860px, so a
    // desktop-only run would never see them.
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],

  webServer: [
    {
      command: 'npm run e2e:api --workspace @skillsplore/api',
      port: API_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: apiEnv,
    },
    {
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      port: WEB_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { E2E_API_PORT: String(API_PORT) },
    },
  ],
});
