/**
 * Removes the fictional demo accounts and everything attached to them.
 *
 * `demo:reset` is the wrong tool for this: it truncates every table and
 * reseeds, so it would both destroy real signups and put the fictional tutors
 * straight back. This deletes only what the demo seed created and leaves the
 * catalogue, teaching levels, legal documents and any real accounts alone.
 *
 * Demo accounts are identified by their `@demo.skillsplore.local` addresses.
 * That domain is not routable, so no real person can ever hold one -- which is
 * what makes matching on it safe rather than a heuristic.
 *
 * Deliberately NOT guarded by guardDemoCommand: the whole point is to run it
 * against a deployment that is becoming production. It is guarded instead by
 * only ever touching rows whose owner has an unroutable address, and by
 * printing what it will delete before doing it.
 *
 * Usage:
 *   npx tsx apps/api/prisma/removeDemoData.ts          # dry run, prints only
 *   npx tsx apps/api/prisma/removeDemoData.ts --commit # actually deletes
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEMO_EMAIL_SUFFIX = '@demo.skillsplore.local';
const commit = process.argv.includes('--commit');

async function main() {
  const demoUsers = await prisma.user.findMany({
    where: { email: { endsWith: DEMO_EMAIL_SUFFIX } },
    select: { id: true, email: true, displayName: true },
  });

  if (demoUsers.length === 0) {
    console.log('No demo accounts found. Nothing to do.');
    return;
  }

  const ids = demoUsers.map((u) => u.id);

  // Counted before deleting so the output states what actually goes, rather
  // than what the cascade is assumed to reach.
  const [profiles, requests, reviews, engagements, messages, reports] = await Promise.all([
    prisma.tutorProfile.count({ where: { userId: { in: ids } } }),
    prisma.tutoringRequest.count({ where: { studentId: { in: ids } } }),
    prisma.review.count({ where: { studentId: { in: ids } } }),
    prisma.engagement.count({ where: { studentId: { in: ids } } }),
    prisma.message.count({ where: { senderId: { in: ids } } }),
    prisma.report.count({ where: { reporterId: { in: ids } } }),
  ]);

  console.log(`\nDemo accounts found: ${demoUsers.length}`);
  for (const u of demoUsers) console.log(`  - ${u.displayName} <${u.email}>`);
  console.log('\nAttached rows that will go with them:');
  console.log(`  tutor profiles ${profiles}`);
  console.log(`  requests       ${requests}`);
  console.log(`  reviews        ${reviews}`);
  console.log(`  engagements    ${engagements}`);
  console.log(`  messages       ${messages}`);
  console.log(`  reports        ${reports}`);

  const realUsers = await prisma.user.count({ where: { email: { not: { endsWith: DEMO_EMAIL_SUFFIX } } } });
  console.log(`\nReal accounts that will NOT be touched: ${realUsers}`);

  // The demo seed creates the only ADMIN account that exists in a fresh
  // database. Deleting it with no real administrator behind it locks everyone
  // out of /admin permanently -- no tutor approvals, no report handling, no
  // privacy requests -- and the only way back is database access.
  const survivingAdmins = await prisma.user.count({
    where: { roles: { has: 'ADMIN' }, email: { not: { endsWith: DEMO_EMAIL_SUFFIX } } },
  });
  if (survivingAdmins === 0) {
    console.error('\nSTOPPING. Every administrator here is a demo account, so this would leave');
    console.error('nobody able to reach /admin.\n');
    console.error('Register your real account on the site, then grant it admin:');
    console.error('  npx tsx apps/api/prisma/grantAdmin.ts you@example.com --commit\n');
    console.error('Then re-run this.\n');
    process.exitCode = 1;
    return;
  }
  console.log(`Real administrators who will remain: ${survivingAdmins}`);

  if (!commit) {
    console.log('\nDry run. Nothing deleted. Re-run with --commit to apply.\n');
    return;
  }

  // Verification.reviewedById is the one User reference that does not cascade
  // and cannot be nulled (the column is NOT NULL), so deleting a demo admin
  // who reviewed a verification fails on the foreign key.
  //
  // Verifications belonging to demo tutors go anyway when their profile is
  // deleted, so those are cleared first. A verification REVIEWED by a demo
  // admin but belonging to a REAL tutor is a different matter: deleting it
  // would destroy a real record, so this stops and says so rather than
  // deciding on the operator's behalf.
  const orphanedReviews = await prisma.verification.findMany({
    where: {
      reviewedById: { in: ids },
      tutorProfile: { userId: { notIn: ids } },
    },
    select: { id: true, tutorProfileId: true },
  });

  if (orphanedReviews.length > 0) {
    console.error(
      `\nSTOPPING. ${orphanedReviews.length} verification(s) belonging to REAL tutors were `
      + 'reviewed by a demo admin account:',
    );
    for (const v of orphanedReviews) console.error(`  verification ${v.id} on tutor profile ${v.tutorProfileId}`);
    console.error(
      '\nDeleting the demo admin would destroy those records. Reassign them to a real admin '
      + 'account first, then re-run.\n',
    );
    process.exitCode = 1;
    return;
  }

  await prisma.verification.deleteMany({ where: { reviewedById: { in: ids } } });

  // User is the root for everything else: it all cascades, so one delete is
  // enough and there is no further ordering to get wrong.
  const result = await prisma.user.deleteMany({ where: { id: { in: ids } } });
  console.log(`\nDeleted ${result.count} demo account(s) and everything attached.\n`);

  const [categories, subjects, levels, documents] = await Promise.all([
    prisma.category.count(),
    prisma.subject.count(),
    prisma.teachingLevel.count(),
    prisma.legalDocument.count(),
  ]);
  console.log('Reference data left intact:');
  console.log(`  categories ${categories}, subjects ${subjects}, levels ${levels}, legal documents ${documents}\n`);
}

main()
  .catch((err) => {
    console.error('Failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
