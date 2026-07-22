/**
 * demo:reset — rebuilds the demonstration environment from scratch.
 * Destructive: wipes all data, then reseeds. Refuses in production and requires
 * explicit confirmation.
 *
 *   npm run demo:reset -- --yes
 */
import { guardDemoCommand } from './_demo.js';

guardDemoCommand('demo:reset');

const confirmed = process.argv.includes('--yes') || process.env.CONFIRM === 'RESET';
if (!confirmed) {
  console.error(
    'This will DELETE ALL DATA in the target database and reseed it.\n' +
      'Re-run with confirmation to proceed:\n\n' +
      '  npm run demo:reset -- --yes\n',
  );
  process.exit(1);
}

console.log('Confirmation received. Rebuilding demonstration data...\n');
// Reseeding truncates and repopulates everything (see seed.ts).
await import('./seed.js');
