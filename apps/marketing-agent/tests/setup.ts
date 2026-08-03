import { execSync } from 'node:child_process';

const TEST_DB = 'postgresql://skillsplore:skillsplore@localhost:5432/skillsplore_marketing_test?schema=public';

// Applies the current schema to the isolated test database before the suite.
// Never touches the demo/production skillsplore_marketing database.
export default function globalSetup() {
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: TEST_DB },
  });
}
