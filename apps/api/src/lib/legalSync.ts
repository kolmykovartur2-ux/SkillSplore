/**
 * Idempotent sync of legal documents and consent wording into the database.
 *
 * Runs on boot, like syncTaxonomy. Same discipline: additive only.
 *
 * The critical rule here is that **a published version is immutable**. If the
 * body in source no longer matches the stored version, this does NOT rewrite
 * the stored row -- it creates a new version. Rewriting would destroy the
 * evidentiary value of every UserLegalAcceptance pointing at it, which is the
 * entire reason the table exists.
 *
 * New versions are created UNPUBLISHED. Publishing is a deliberate human act
 * (see publishVersion), gated on the placeholder scanner.
 */
import type { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import { LEGAL_DOCUMENTS, INITIAL_VERSION } from '../content/legal/index.js';
import { CONSENT_VERSIONS } from '../content/legal/consents.js';
import { scanPlaceholders, LegalDocumentNotPublishableError } from './legalPlaceholders.js';

function bodyFingerprint(body: string): string {
  return createHash('sha256').update(body.trim()).digest('hex').slice(0, 12);
}

export interface LegalSyncResult {
  documentsCreated: number;
  versionsCreated: number;
  consentVersionsCreated: number;
  /** Slugs whose source body has drifted from the newest stored version. */
  driftedDocuments: string[];
}

export async function syncLegalDocuments(prisma: PrismaClient): Promise<LegalSyncResult> {
  let documentsCreated = 0;
  let versionsCreated = 0;
  let consentVersionsCreated = 0;
  const driftedDocuments: string[] = [];

  for (const def of LEGAL_DOCUMENTS) {
    let doc = await prisma.legalDocument.findUnique({ where: { slug: def.slug } });
    if (!doc) {
      doc = await prisma.legalDocument.create({ data: { slug: def.slug, title: def.title } });
      documentsCreated++;
    }

    const newest = await prisma.legalDocumentVersion.findFirst({
      where: { documentId: doc.id },
      orderBy: { createdAt: 'desc' },
    });

    // Unchanged since the last sync -- nothing to do.
    if (newest && newest.body.trim() === def.body.trim()) continue;

    const version = newest ? `${INITIAL_VERSION}+${bodyFingerprint(def.body)}` : INITIAL_VERSION;
    if (newest) driftedDocuments.push(def.slug);

    // A version row may already exist for this exact fingerprint if the body
    // was reverted to an earlier state; findFirst above only looks at the
    // newest, so guard the unique constraint explicitly.
    const already = await prisma.legalDocumentVersion.findUnique({
      where: { documentId_version: { documentId: doc.id, version } },
    });
    if (already) continue;

    const { unresolved } = scanPlaceholders(def.body);
    await prisma.legalDocumentVersion.create({
      data: {
        documentId: doc.id,
        version,
        body: def.body,
        unresolvedPlaceholders: unresolved,
        // Deliberately not published and not marked reviewed. Both require a
        // human decision.
        publishedAt: null,
        legalReviewedAt: null,
      },
    });
    versionsCreated++;
  }

  for (const def of CONSENT_VERSIONS) {
    const exists = await prisma.consentVersion.findUnique({
      where: { kind_version: { kind: def.kind, version: def.version } },
    });
    if (exists) continue;

    await prisma.consentVersion.create({
      data: {
        kind: def.kind,
        version: def.version,
        wording: def.wording,
        purpose: def.purpose,
        dataCategories: def.dataCategories,
        excludedCategories: def.excludedCategories,
        recipientCategories: def.recipientCategories,
        countries: def.countries,
        retentionSummary: def.retentionSummary,
        withdrawalSummary: def.withdrawalSummary,
        recipientsMustDeleteOnWithdrawal: def.recipientsMustDeleteOnWithdrawal,
        priorDisclosuresReversible: def.priorDisclosuresReversible,
      },
    });
    consentVersionsCreated++;
  }

  return { documentsCreated, versionsCreated, consentVersionsCreated, driftedDocuments };
}

/**
 * Publish a specific version and point its document at it.
 *
 * Refuses when placeholders remain. Note this deliberately does NOT require
 * `legalReviewedAt` -- a founder may legitimately want the filled-in drafts
 * visible on a staging site before a lawyer has signed off. What it does
 * guarantee is that no `[[PLACEHOLDER]]` ever reaches a reader.
 */
export async function publishVersion(
  prisma: PrismaClient,
  versionId: number,
  opts: { effectiveAt?: Date } = {},
): Promise<void> {
  const version = await prisma.legalDocumentVersion.findUniqueOrThrow({ where: { id: versionId } });

  const { unresolved } = scanPlaceholders(version.body);
  if (unresolved.length > 0) throw new LegalDocumentNotPublishableError(unresolved);

  await prisma.$transaction([
    prisma.legalDocumentVersion.update({
      where: { id: versionId },
      data: {
        publishedAt: new Date(),
        effectiveAt: opts.effectiveAt ?? new Date(),
        unresolvedPlaceholders: [],
      },
    }),
    prisma.legalDocument.update({
      where: { id: version.documentId },
      data: { currentVersionId: versionId },
    }),
  ]);
}
