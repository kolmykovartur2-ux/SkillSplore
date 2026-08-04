import { defineConfig } from 'vitest/config';

// Tests run against an isolated PostgreSQL database (skillsplore_marketing_test),
// separate from both the demo/production marketing DB and the marketplace's own
// skillsplore_test DB. globalSetup applies migrations once before the suite.
export default defineConfig({
  test: {
    globalSetup: './tests/setup.ts',
    env: {
      APP_ENV: 'development',
      DATABASE_URL:
        'postgresql://skillsplore:skillsplore@localhost:5432/skillsplore_marketing_test?schema=public',
      SESSION_SECRET: 'test-only-session-secret-abcdefghijklmnopqrstuvwxyz',
      TOKEN_ENCRYPTION_KEY: 'test-only-token-encryption-key-abcdefghijklmnop',
      ADMIN_BOOTSTRAP_EMAIL: 'founder@test.local',
      ADMIN_BOOTSTRAP_PASSWORD: 'test-password-123',
      CONTENT_AI_PROVIDER: 'template',
      MOCK_LINKEDIN_API: 'true',
      // Isolated from the dev/demo storage directory for the same reason the
      // database is: a test run must not deposit files into the real media
      // library. resetDb() clears rows, so anything left here is orphaned.
      OBJECT_STORAGE_PROVIDER: 'local',
      OBJECT_STORAGE_LOCAL_DIR: './storage-data-test',
      // Image generation defaults off; the suite pins the flag per-test rather
      // than depending on whatever the developer has in their own .env.
      IMAGE_AI_PROVIDER: 'none',
      IMAGE_AI_BASE_URL: '',
    },
    fileParallelism: false,
    hookTimeout: 60000,
    testTimeout: 30000,
  },
});
