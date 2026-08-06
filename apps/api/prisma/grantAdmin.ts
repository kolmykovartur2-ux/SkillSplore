/**
 * Grants (or revokes) the ADMIN role on a real account.
 *
 * This exists because there was no way to create an administrator outside the
 * demo seed. The only ADMIN in any database was `admin@demo.skillsplore.local`,
 * created by `demo:seed` -- which means `removeDemoData.ts --commit` would have
 * deleted the only account able to reach /admin, with nothing in the codebase
 * able to make another one. Approving tutors, handling reports and answering
 * privacy requests would all have become impossible without direct SQL.
 *
 * Deliberately NOT guarded by guardDemoCommand: granting a founder admin on
 * their own production deployment is the entire point.
 *
 * Deliberately a CLI tool and not an API endpoint. An HTTP route that grants
 * ADMIN is a privilege-escalation target forever after; a script needs
 * DATABASE_URL, which is already the keys to everything.
 *
 * Usage:
 *   npx tsx apps/api/prisma/grantAdmin.ts --list
 *   npx tsx apps/api/prisma/grantAdmin.ts you@example.com          # dry run
 *   npx tsx apps/api/prisma/grantAdmin.ts you@example.com --commit
 *   npx tsx apps/api/prisma/grantAdmin.ts you@example.com --revoke --commit
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const commit = args.includes('--commit');
const revoke = args.includes('--revoke');
const list = args.includes('--list');
const email = args.find((a) => !a.startsWith('--'))?.toLowerCase().trim();

async function showAdmins() {
  const admins = await prisma.user.findMany({
    where: { roles: { has: 'ADMIN' } },
    select: { id: true, email: true, displayName: true, status: true },
    orderBy: { id: 'asc' },
  });
  if (admins.length === 0) {
    console.log('\nNo administrators exist. Nobody can reach /admin.');
    return;
  }
  console.log(`\nAdministrators (${admins.length}):`);
  for (const a of admins) console.log(`  #${a.id}  ${a.displayName} <${a.email}>  [${a.status}]`);
}

async function main() {
  if (list || !email) {
    await showAdmins();
    if (!email) {
      console.log('\nUsage: npx tsx apps/api/prisma/grantAdmin.ts <email> [--revoke] --commit\n');
    }
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, displayName: true, roles: true, status: true, emailVerifiedAt: true },
  });

  if (!user) {
    console.error(`\nNo account with the address ${email}.`);
    console.error('Register through the website first, then run this against that address.\n');
    process.exitCode = 1;
    return;
  }

  const hasAdmin = user.roles.includes('ADMIN');
  console.log(`\n${user.displayName} <${user.email}>  #${user.id}`);
  console.log(`  status:  ${user.status}`);
  console.log(`  roles:   ${user.roles.join(', ')}`);

  if (revoke && !hasAdmin) {
    console.log('\nAlready not an administrator. Nothing to do.\n');
    return;
  }
  if (!revoke && hasAdmin) {
    console.log('\nAlready an administrator. Nothing to do.\n');
    return;
  }

  // Removing the last administrator locks everyone out of /admin, and the only
  // way back is this script plus database access. Worth stopping for.
  if (revoke) {
    const adminCount = await prisma.user.count({ where: { roles: { has: 'ADMIN' } } });
    if (adminCount <= 1) {
      console.error('\nSTOPPING. This is the only administrator; revoking would lock everyone out of /admin.');
      console.error('Grant ADMIN to another account first.\n');
      process.exitCode = 1;
      return;
    }
  }

  if (!user.emailVerifiedAt && !revoke) {
    // Not fatal -- an operator may be setting this up before checking mail --
    // but sign-in may require verification, so say so rather than let them
    // discover it at the login screen.
    console.log('\n  NOTE: this address is not verified yet, which may block sign-in.');
  }

  const nextRoles = revoke
    ? user.roles.filter((r) => r !== 'ADMIN')
    : [...user.roles, 'ADMIN' as const];

  console.log(`\n  ${revoke ? 'REVOKE' : 'GRANT'} ADMIN -> roles become: ${nextRoles.join(', ')}`);

  if (!commit) {
    console.log('\nDry run. Nothing changed. Re-run with --commit to apply.\n');
    return;
  }

  await prisma.user.update({ where: { id: user.id }, data: { roles: { set: nextRoles } } });
  console.log(`\nDone. ${user.email} ${revoke ? 'is no longer' : 'is now'} an administrator.`);
  await showAdmins();
  console.log('');
}

main()
  .catch((err) => {
    console.error('Failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
