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
    },
    fileParallelism: false,
    hookTimeout: 60000,
    testTimeout: 30000,
  },
});
