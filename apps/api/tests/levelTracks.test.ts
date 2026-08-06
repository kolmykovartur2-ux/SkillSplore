/**
 * Teaching levels are offered per track.
 *
 * The catalogue shipped one NCEA-shaped list of levels, and a level was
 * mandatory to submit a profile. That made an SEO tutor -- or a welder, or a
 * tattoo artist -- describe themselves with a school year or with
 * "Adult / Hobby", because nothing else existed. Roughly 30 of the 37
 * categories are not school subjects at all.
 *
 * These tests pin the rule that fixes it: a tutor is offered the level
 * vocabularies their chosen subjects actually use, and the union when they
 * teach across both.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { prisma, resetDb } from './helpers.js';
import { applicableLevelTracks } from '../src/modules/tutors/tutors.service.js';
import { TEACHING_LEVELS, syncTaxonomy } from '../prisma/syncTaxonomy.js';

describe('applicableLevelTracks', () => {
  const academic = { subject: { category: { levelTracks: ['ACADEMIC' as const] } } };
  const professional = { subject: { category: { levelTracks: ['PROFESSIONAL' as const] } } };
  const both = { subject: { category: { levelTracks: ['ACADEMIC' as const, 'PROFESSIONAL' as const] } } };

  it('offers only the professional ladder for a professional subject', () => {
    expect(applicableLevelTracks([professional])).toEqual(['PROFESSIONAL']);
  });

  it('offers only the academic ladder for a school subject', () => {
    expect(applicableLevelTracks([academic])).toEqual(['ACADEMIC']);
  });

  it('offers both when a tutor teaches across tracks', () => {
    // The case a per-subject rule would get wrong: levels are stored per
    // profile, so someone teaching NCEA calculus and SEO must see both.
    expect(applicableLevelTracks([academic, professional])).toEqual(['ACADEMIC', 'PROFESSIONAL']);
  });

  it('deduplicates and keeps academic first regardless of subject order', () => {
    expect(applicableLevelTracks([professional, both, academic])).toEqual(['ACADEMIC', 'PROFESSIONAL']);
  });

  it('returns nothing when no subjects are chosen', () => {
    expect(applicableLevelTracks([])).toEqual([]);
  });

  it('treats a subject with no category as contributing no tracks', () => {
    // Must not fall back to a default -- that would put the school ladder back
    // in front of a professional tutor, which is the whole bug.
    expect(applicableLevelTracks([{ subject: { category: null } }])).toEqual([]);
  });
});

describe('seeded level data', () => {
  beforeAll(async () => {
    // Build the catalogue from taxonomy.data.ts rather than reading whatever
    // happens to be in the database, so these assert what a fresh deployment
    // actually gets.
    await resetDb();
    await syncTaxonomy(prisma);
  });

  it('ships both vocabularies', () => {
    const tracks = new Set(TEACHING_LEVELS.map((l) => l.track));
    expect([...tracks].sort()).toEqual(['ACADEMIC', 'PROFESSIONAL']);
  });

  it('has no duplicate level names', () => {
    // `name` is unique in the database, so a collision between the two tracks
    // would fail the sync at boot rather than here. In New Zealand
    // "Intermediate" already means Years 7-8, which is why the professional
    // ladder does not reuse it.
    const names = TEACHING_LEVELS.map((l) => l.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('keeps NCEA levels out of the professional ladder', () => {
    const professional = TEACHING_LEVELS.filter((l) => l.track === 'PROFESSIONAL');
    expect(professional.some((l) => /NCEA|Primary|graduate/i.test(l.name))).toBe(false);
  });

  it('offers a professional-only ladder for a marketing subject', async () => {
    const subject = await prisma.subject.findFirst({
      where: { name: 'Search engine optimisation' },
      include: { category: true },
    });
    expect(subject, 'Search engine optimisation should exist in the catalogue').toBeTruthy();
    expect(subject!.category!.levelTracks).toEqual(['PROFESSIONAL']);

    const levels = await prisma.teachingLevel.findMany({
      where: { track: { in: subject!.category!.levelTracks } },
    });
    expect(levels.length).toBeGreaterThan(0);
    expect(levels.some((l) => l.name.includes('NCEA'))).toBe(false);
  });

  it('still offers school levels for a school subject', async () => {
    const subject = await prisma.subject.findFirst({
      where: { name: 'NCEA calculus' },
      include: { category: true },
    });
    expect(subject).toBeTruthy();
    expect(subject!.category!.levelTracks).toContain('ACADEMIC');

    const levels = await prisma.teachingLevel.findMany({
      where: { track: { in: subject!.category!.levelTracks } },
    });
    expect(levels.some((l) => l.name.includes('NCEA'))).toBe(true);
  });
});
