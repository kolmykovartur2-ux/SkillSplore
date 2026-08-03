/**
 * The demo seed only runs on an empty database, so a deployment that already
 * has users could never pick up newly-added categories or subjects. That is
 * exactly how the live site drifted behind the code. syncTaxonomy runs on every
 * boot to close that gap, so these tests pin down the two properties that make
 * it safe to run against production: it adds what's missing, and it never
 * destroys or moves anything that already exists.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma, resetDb } from './helpers.js';
import { syncTaxonomy } from '../prisma/syncTaxonomy.js';
import { TAXONOMY, TOTAL_SUBJECTS } from '../prisma/taxonomy.data.js';
import { normalizeName } from '../src/lib/normalize.js';

describe('taxonomy sync', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('populates an empty catalogue from the taxonomy file', async () => {
    const result = await syncTaxonomy(prisma);

    expect(result.categoriesAdded).toBe(TAXONOMY.length);
    expect(await prisma.category.count()).toBe(TAXONOMY.length);
    expect(await prisma.subject.count()).toBe(TOTAL_SUBJECTS);
  });

  it('is idempotent: a second run changes nothing', async () => {
    await syncTaxonomy(prisma);
    const categoriesBefore = await prisma.category.count();
    const subjectsBefore = await prisma.subject.count();

    const second = await syncTaxonomy(prisma);

    expect(second.categoriesAdded).toBe(0);
    expect(second.subjectsAdded).toBe(0);
    expect(await prisma.category.count()).toBe(categoriesBefore);
    expect(await prisma.subject.count()).toBe(subjectsBefore);
  });

  it('adds only the categories and subjects that are missing', async () => {
    await syncTaxonomy(prisma);

    // Simulate a deployment stuck on an older catalogue.
    const dropped = TAXONOMY[TAXONOMY.length - 1]!;
    const category = await prisma.category.findUniqueOrThrow({
      where: { normalizedName: normalizeName(dropped.name) },
    });
    await prisma.subject.deleteMany({ where: { categoryId: category.id } });
    await prisma.category.delete({ where: { id: category.id } });

    const result = await syncTaxonomy(prisma);

    expect(result.categoriesAdded).toBe(1);
    expect(result.subjectsAdded).toBe(dropped.subjects.length);

    const restored = await prisma.category.findUniqueOrThrow({
      where: { normalizedName: normalizeName(dropped.name) },
      include: { subjects: true },
    });
    expect(restored.icon).toBe(dropped.icon);
    expect(restored.subjects).toHaveLength(dropped.subjects.length);
  });

  it('never deletes admin-created categories or subjects that are absent from the file', async () => {
    await syncTaxonomy(prisma);

    const custom = await prisma.category.create({
      data: {
        name: 'Founder Custom Category',
        normalizedName: normalizeName('Founder Custom Category'),
        slug: 'founder-custom-category',
        icon: '🧪',
      },
    });
    const customSubject = await prisma.subject.create({
      data: {
        name: 'Founder Custom Subject',
        normalizedName: normalizeName('Founder Custom Subject'),
        slug: 'founder-custom-subject',
        categoryId: custom.id,
      },
    });

    await syncTaxonomy(prisma);

    expect(await prisma.category.findUnique({ where: { id: custom.id } })).not.toBeNull();
    expect(await prisma.subject.findUnique({ where: { id: customSubject.id } })).not.toBeNull();
  });

  it('leaves a subject where an admin moved it rather than dragging it back', async () => {
    await syncTaxonomy(prisma);

    // Take a subject the file assigns to one category and reassign it, the way
    // an admin reorganising the catalogue would.
    const source = TAXONOMY[0]!;
    const movedName = source.subjects[0]!;
    const elsewhere = await prisma.category.findUniqueOrThrow({
      where: { normalizedName: normalizeName(TAXONOMY[1]!.name) },
    });
    const moved = await prisma.subject.update({
      where: { normalizedName: normalizeName(movedName) },
      data: { categoryId: elsewhere.id },
    });

    const result = await syncTaxonomy(prisma);

    expect(result.subjectsAdded).toBe(0);
    const after = await prisma.subject.findUniqueOrThrow({ where: { id: moved.id } });
    expect(after.categoryId).toBe(elsewhere.id);
  });

  it('backfills a missing icon without touching anything else', async () => {
    await syncTaxonomy(prisma);

    const target = TAXONOMY[0]!;
    await prisma.category.update({
      where: { normalizedName: normalizeName(target.name) },
      data: { icon: null },
    });

    const result = await syncTaxonomy(prisma);

    expect(result.iconsBackfilled).toBe(1);
    expect(result.categoriesAdded).toBe(0);
    const restored = await prisma.category.findUniqueOrThrow({
      where: { normalizedName: normalizeName(target.name) },
    });
    expect(restored.icon).toBe(target.icon);
  });
});
