/**
 * demo:accounts — prints the documented demonstration accounts.
 * Non-destructive. Refuses in production.
 */
import { prisma, guardDemoCommand, DEMO_ACCOUNTS, DEMO_PASSWORD } from './_demo.js';

async function main() {
  guardDemoCommand('demo:accounts');

  console.log('Documented demonstration accounts (development/demo only):\n');
  const rows: Array<[string, string, string]> = [];
  for (const [role, email] of Object.entries(DEMO_ACCOUNTS)) {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    rows.push([role, email, user ? 'seeded' : 'NOT SEEDED — run npm run demo:seed']);
  }
  const pad = (s: string, n: number) => s.padEnd(n);
  console.log(pad('ROLE', 16) + pad('EMAIL', 40) + 'STATUS');
  for (const [role, email, status] of rows) console.log(pad(role, 16) + pad(email, 40) + status);
  console.log(`\nPassword for all demo accounts: ${DEMO_PASSWORD}`);
  console.log('These credentials exist only in non-production databases.\n');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
