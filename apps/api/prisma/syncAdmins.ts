/**
 * Grants ADMIN to the accounts named in ADMIN_EMAILS, on every boot.
 *
 * The problem this solves: the only ADMIN account that has ever existed is the
 * one `demo:seed` creates, and `grantAdmin.ts` needs a shell with DATABASE_URL.
 * On Render's free tier there is no shell, and the production database
 * credentials are deliberately not in source control -- so a founder deploying
 * this had no way to make themselves an administrator at all.
 *
 * ADMIN_EMAILS is set in the host's dashboard, alongside DATABASE_URL and
 * SESSION_SECRET. Anyone who can set it can already read the database, so this
 * grants no privilege that was not already available -- it just makes it
 * reachable without a shell.
 *
 * Rules, all deliberate:
 *
 *   - Only ever grants to an account that ALREADY EXISTS. It never creates
 *     one. Registration goes through the normal flow, with a password the
 *     operator chooses and an address they control; an account conjured from
 *     an env var would have neither.
 *
 *   - Never revokes. Removing an address from ADMIN_EMAILS does not demote
 *     anyone -- a typo in an env var should not silently strip access from a
 *     working administrator mid-deploy. Use `grantAdmin.ts --revoke` for that,
 *     deliberately and with the last-admin guard.
 *
 *   - Never fails the boot. An address that has not registered yet is normal
 *     on a first deploy: set the variable, then sign up, and the next restart
 *     picks it up. Taking the site down over it would be absurd.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function syncAdmins(db: PrismaClient = prisma): Promise<number> {
  const raw = (process.env.ADMIN_EMAILS ?? '').trim();
  if (!raw) return 0;

  const emails = raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (emails.length === 0) return 0;

  let granted = 0;
  for (const email of emails) {
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, email: true, displayName: true, roles: true },
    });

    if (!user) {
      console.log(`[admins] ${email} has no account yet — register, then redeploy or restart.`);
      continue;
    }
    if (user.roles.includes('ADMIN')) continue;

    await db.user.update({
      where: { id: user.id },
      data: { roles: { set: [...user.roles, 'ADMIN'] } },
    });
    console.log(`[admins] granted ADMIN to ${user.displayName} <${user.email}>`);
    granted++;
  }
  return granted;
}

// Allow running directly: `npx tsx apps/api/prisma/syncAdmins.ts`
if (process.argv[1] && process.argv[1].endsWith('syncAdmins.ts')) {
  syncAdmins()
    .then(async (granted) => {
      const total = await prisma.user.count({ where: { roles: { has: 'ADMIN' } } });
      console.log(`[admins] sync complete: ${granted} granted, ${total} administrator(s) total.`);
      if (total === 0) {
        console.log('[admins] WARNING: nobody can reach /admin. Set ADMIN_EMAILS to an address that has registered.');
      }
    })
    .catch((err) => {
      // Loud, but not fatal -- see the header. The site must still come up.
      console.error('[admins] sync failed (continuing):', err);
    })
    .finally(() => prisma.$disconnect());
}
