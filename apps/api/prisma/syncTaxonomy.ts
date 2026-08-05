/**
 * Idempotent taxonomy sync.
 *
 * The demo seed only runs on a genuinely empty database, so once a deployment
 * has any users it can never pick up newly-added categories or subjects. That
 * left production stuck on an old catalogue while the code moved on.
 *
 * This runs on every boot instead, and is deliberately ADDITIVE ONLY:
 *   - inserts categories/subjects/aliases from taxonomy.data.ts that don't
 *     exist yet
 *   - backfills a missing icon on an existing category
 *   - never deletes, renames, or reassigns anything
 *
 * That last point matters: administrators can create categories and subjects
 * at runtime, and learners/providers are attached to them. Removing or moving
 * rows to match the file would destroy real data, so this only ever adds
 * what's missing. Safe to run against production, and safe to run repeatedly.
 *
 * `isFeatured` is set only when a category is first created, never on an
 * existing one -- there is no way to tell "never set" apart from "an admin
 * deliberately unfeatured it" once the column exists, so re-applying the
 * file's value on every boot would silently overturn that decision.
 */
import { PrismaClient } from '@prisma/client';
import { TAXONOMY, ALIASES } from './taxonomy.data.js';
import { normalizeName } from '../src/lib/normalize.js';

function slug(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * Teaching levels are reference data, not demo data.
 *
 * They used to be created only by seed.ts, which refuses to run in
 * production -- so a real production database would have had none at all,
 * leaving providers unable to state what level they teach and the level
 * filter in search permanently empty.
 */
export const TEACHING_LEVELS = [
  'Primary',
  'Intermediate',
  'NCEA Level 1',
  'NCEA Level 2',
  'NCEA Level 3',
  'Undergraduate',
  'Postgraduate',
  'Adult / Hobby',
];

export interface SyncResult {
  categoriesAdded: number;
  subjectsAdded: number;
  iconsBackfilled: number;
  aliasesAdded: number;
  levelsAdded: number;
}

export async function syncTaxonomy(prisma: PrismaClient): Promise<SyncResult> {
  let categoriesAdded = 0;
  let subjectsAdded = 0;
  let iconsBackfilled = 0;
  let aliasesAdded = 0;
  let levelsAdded = 0;

  // Additive and order-preserving, like everything else here. An admin who
  // renamed a level keeps their rename; only genuinely missing levels are
  // inserted.
  for (let i = 0; i < TEACHING_LEVELS.length; i++) {
    const name = TEACHING_LEVELS[i]!;
    const existing = await prisma.teachingLevel.findFirst({ where: { slug: slug(name) } });
    if (existing) continue;
    await prisma.teachingLevel.create({ data: { name, slug: slug(name), sortOrder: i } });
    levelsAdded++;
  }

  // name -> id, used below to resolve alias targets without a second query
  // per alias.
  const subjectIdByNormalizedName = new Map<string, number>();
  const categoryIdByNormalizedName = new Map<string, number>();

  for (const cat of TAXONOMY) {
    const normalized = normalizeName(cat.name);
    let category = await prisma.category.findUnique({ where: { normalizedName: normalized } });

    if (!category) {
      category = await prisma.category.create({
        data: {
          name: cat.name,
          normalizedName: normalized,
          slug: slug(cat.name),
          icon: cat.icon,
          isFeatured: !!cat.featured,
        },
      });
      categoriesAdded++;
    } else if (!category.icon && cat.icon) {
      category = await prisma.category.update({ where: { id: category.id }, data: { icon: cat.icon } });
      iconsBackfilled++;
    }
    categoryIdByNormalizedName.set(normalized, category.id);

    for (const subjectName of cat.subjects) {
      const subjectNormalized = normalizeName(subjectName);
      let subject = await prisma.subject.findUnique({ where: { normalizedName: subjectNormalized } });
      // Already present -- leave it exactly where it is, even if it currently
      // sits under a different category. An admin may have moved it on purpose.
      if (!subject) {
        subject = await prisma.subject.create({
          data: {
            name: subjectName,
            normalizedName: subjectNormalized,
            slug: slug(subjectName),
            categoryId: category.id,
          },
        });
        subjectsAdded++;
      }
      subjectIdByNormalizedName.set(subjectNormalized, subject.id);
    }
  }

  for (const alias of ALIASES) {
    const normalizedTerm = normalizeName(alias.term);
    const exists = await prisma.taxonomyAlias.findUnique({ where: { normalizedTerm } });
    if (exists) continue;

    const targetNormalized = normalizeName(alias.target);
    const subjectId = subjectIdByNormalizedName.get(targetNormalized);
    const categoryId = subjectId ? undefined : categoryIdByNormalizedName.get(targetNormalized);
    // A target that resolves to neither is a typo in taxonomy.data.ts, not a
    // database problem -- skip rather than fail the whole boot over it.
    if (!subjectId && !categoryId) continue;

    await prisma.taxonomyAlias.create({
      data: { term: alias.term, normalizedTerm, subjectId, categoryId },
    });
    aliasesAdded++;
  }

  return { categoriesAdded, subjectsAdded, iconsBackfilled, aliasesAdded, levelsAdded };
}

// Allow running directly: `npx tsx apps/api/prisma/syncTaxonomy.ts`
if (process.argv[1] && process.argv[1].endsWith('syncTaxonomy.ts')) {
  const prisma = new PrismaClient();
  syncTaxonomy(prisma)
    .then((r) => {
      console.log(
        `[taxonomy] sync complete: +${r.categoriesAdded} categories, +${r.subjectsAdded} subjects, `
        + `+${r.aliasesAdded} aliases, +${r.levelsAdded} levels, ${r.iconsBackfilled} icon(s) backfilled.`,
      );
    })
    .catch((err) => {
      console.error('[taxonomy] sync failed:', err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
