// Container entrypoint for hosts that don't support a separate pre-deploy
// step (e.g. Render's free tier). Applies pending migrations on every boot
// (idempotent, safe), seeds demo data only if the database is empty (so a
// cold-start restart on a free/sleeping tier doesn't wipe real activity),
// then starts the server in this same process.
import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

function run(cmd, args) {
  // Only needed on Windows, where `npx` is a .cmd shim and can't be spawned
  // directly -- Linux (where this actually runs in production) never hits
  // this branch. Args here are always fixed constants, never external input.
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) {
    console.error(`[bootstrap] command failed: ${cmd} ${args.join(' ')}`);
    process.exit(result.status ?? 1);
  }
}

console.log('[bootstrap] applying database migrations...');
run('npx', ['prisma', 'migrate', 'deploy', '--schema', 'apps/api/prisma/schema.prisma']);

const appEnv = process.env.APP_ENV ?? 'development';
if (appEnv !== 'production') {
  const prisma = new PrismaClient();
  const userCount = await prisma.user.count();
  await prisma.$disconnect();
  if (userCount === 0) {
    console.log('[bootstrap] database is empty, running demo seed...');
    run('npx', ['tsx', 'apps/api/prisma/seed.ts']);
  } else {
    console.log(`[bootstrap] database already has ${userCount} user(s), skipping demo seed.`);
  }
}

// Always sync the catalogue, in every environment. The demo seed above only
// runs on an empty database, so without this a deployment that already has
// users can never pick up newly-added categories or subjects -- which is
// exactly how production drifted behind the code. Additive only: it inserts
// what's missing and never deletes or moves anything (see syncTaxonomy.ts).
console.log('[bootstrap] syncing subject catalogue...');
run('npx', ['tsx', 'apps/api/prisma/syncTaxonomy.ts']);

console.log('[bootstrap] starting server...');
await import('../dist/index.js');
