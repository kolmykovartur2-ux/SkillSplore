/**
 * Idempotent taxonomy sync.
 *
 * The demo seed only runs on a genuinely empty database, so once a deployment
 * has any users it can never pick up newly-added categories or subjects. That
 * left production stuck on an old catalogue while the code moved on.
 *
 * This runs on every boot instead, and is deliberately ADDITIVE ONLY:
 *   - inserts categories/subjects from taxonomy.data.ts that don't exist yet
 *   - backfills a missing icon on an existing category
 *   - never deletes, renames, or reassigns anything
 *
 * That last point matters: administrators can create categories and subjects at
 * runtime, and learners/providers are attached to them. Removing or moving rows
 * to match the file would destroy real data, so this only ever adds what's
 * missing. Safe to run against production, and safe to run repeatedly.
 */
import { PrismaClient } from '@prisma/client';
import { TAXONOMY } from './taxonomy.data.js';
import { normalizeName } from '../src/lib/normalize.js';

function slug(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export async function syncTaxonomy(prisma: PrismaClient): Promise<{ categoriesAdded: number; subjectsAdded: number; iconsBackfilled: number }> {
  let categoriesAdded = 0;
  let subjectsAdded = 0;
  let iconsBackfilled = 0;

  for (const cat of TAXONOMY) {
    const normalized = normalizeName(cat.name);
    let category = await prisma.category.findUnique({ where: { normalizedName: normalized } });

    if (!category) {
      category = await prisma.category.create({
        data: { name: cat.name, normalizedName: normalized, slug: slug(cat.name), icon: cat.icon },
      });
      categoriesAdded++;
    } else if (!category.icon && cat.icon) {
      category = await prisma.category.update({ where: { id: category.id }, data: { icon: cat.icon } });
      iconsBackfilled++;
    }

    for (const subjectName of cat.subjects) {
      const subjectNormalized = normalizeName(subjectName);
      const existing = await prisma.subject.findUnique({ where: { normalizedName: subjectNormalized } });
      // Already present -- leave it exactly where it is, even if it currently
      // sits under a different category. An admin may have moved it on purpose.
      if (existing) continue;

      await prisma.subject.create({
        data: {
          name: subjectName,
          normalizedName: subjectNormalized,
          slug: slug(subjectName),
          categoryId: category.id,
        },
      });
      subjectsAdded++;
    }
  }

  return { categoriesAdded, subjectsAdded, iconsBackfilled };
}

// Allow running directly: `npx tsx apps/api/prisma/syncTaxonomy.ts`
if (process.argv[1] && process.argv[1].endsWith('syncTaxonomy.ts')) {
  const prisma = new PrismaClient();
  syncTaxonomy(prisma)
    .then((r) => {
      console.log(
        `[taxonomy] sync complete: +${r.categoriesAdded} categories, +${r.subjectsAdded} subjects, ${r.iconsBackfilled} icon(s) backfilled.`,
      );
    })
    .catch((err) => {
      console.error('[taxonomy] sync failed:', err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
