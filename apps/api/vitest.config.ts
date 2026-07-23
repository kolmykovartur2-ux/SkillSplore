import { defineConfig } from 'vitest/config';

// Tests run against an isolated PostgreSQL database (skillsplore_test) so they
// never touch demo/production data. globalSetup applies migrations once.
export default defineConfig({
  test: {
    globalSetup: './tests/setup.ts',
    env: {
      APP_ENV: 'development',
      DATABASE_URL: 'postgresql://skillsplore:skillsplore@localhost:5432/skillsplore_test?schema=public',
      SESSION_SECRET: 'test-only-session-secret-abcdefghijklmnopqrstuvwxyz',
      STORAGE_DRIVER: 'local',
      STORAGE_LOCAL_DIR: './storage-test',
    },
    fileParallelism: false,
    hookTimeout: 60000,
    testTimeout: 30000,
  },
});
