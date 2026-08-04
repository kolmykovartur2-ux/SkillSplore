/**
 * Boot entry point for the legal document and consent-wording sync.
 *
 * Mirrors syncTaxonomy.ts: additive only, safe to run repeatedly, safe against
 * production. The real logic is in src/lib/legalSync.ts -- this file only
 * exists so bootstrap.mjs has something to invoke with tsx.
 *
 * Note what this does NOT do: it never publishes a version. New drafts land
 * unpublished, and the public pages label them as drafts, so a redeploy can
 * never silently promote unreviewed policy text to a live policy.
 */
import { PrismaClient } from '@prisma/client';
import { syncLegalDocuments } from '../src/lib/legalSync.js';

const prisma = new PrismaClient();

syncLegalDocuments(prisma)
  .then((r) => {
    console.log(
      `[legal] sync complete: +${r.documentsCreated} documents, +${r.versionsCreated} versions, `
      + `+${r.consentVersionsCreated} consent versions.`,
    );
    if (r.driftedDocuments.length > 0) {
      console.log(
        `[legal] new draft version(s) created for: ${r.driftedDocuments.join(', ')}. `
        + 'Existing published versions were left untouched; publish the new ones deliberately.',
      );
    }
  })
  .catch((err) => {
    console.error('[legal] sync failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
