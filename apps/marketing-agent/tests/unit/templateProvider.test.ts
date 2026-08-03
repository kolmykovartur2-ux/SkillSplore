import { describe, expect, it } from 'vitest';
import { templateProvider } from '../../src/lib/providers/templateProvider.js';
import type { BriefInput } from '../../src/lib/contentGenerationProvider.js';

const launch = { country: 'NZ', city: 'Auckland', category: 'Tutoring', stage: 'Pre-launch' };

function brief(overrides: Partial<BriefInput> = {}): BriefInput {
  return {
    objective: 'Explain why SkillSplore is being built',
    audience: 'Anyone following the build',
    pillarName: 'Building SkillSplore',
    mainIdea: 'Why SkillSplore is being built',
    productStage: 'Pre-launch',
    desiredReaderAction: 'Follow along and share feedback',
    tone: 'Honest, modest, practical',
    format: 'TEXT_ONLY',
    maxLength: 1200,
    facts: [],
    launch,
    ...overrides,
  };
}

describe('templateProvider (deterministic, no network)', () => {
  it('generates a post that contains the main idea and stays within maxLength', async () => {
    const draft = await templateProvider.generatePostDraft(brief());
    expect(draft.body).toContain('Why SkillSplore is being built');
    expect(draft.body.length).toBeLessThanOrEqual(1200);
  });

  it('never invents numbers not present in the supplied facts', async () => {
    const draft = await templateProvider.generatePostDraft(brief({ facts: [] }));
    expect(draft.body).not.toMatch(/\d[\d,]*\+?\s*(users|tutors|students|customers)/i);
  });

  it('includes a supplied approved fact verbatim when facts are provided', async () => {
    const draft = await templateProvider.generatePostDraft(
      brief({ facts: [{ key: 'pricing.student_cost', value: 'Students use SkillSplore free of charge.', source: 'Product decision' }] }),
    );
    expect(draft.body).toContain('Students use SkillSplore free of charge.');
  });

  it('generateVariants produces distinct variants', async () => {
    const variants = await templateProvider.generateVariants(brief(), 3);
    expect(variants).toHaveLength(3);
    const bodies = new Set(variants.map((v) => v.body));
    expect(bodies.size).toBeGreaterThan(1);
  });

  it('never uses banned exaggerated language', async () => {
    const variants = await templateProvider.generateVariants(brief(), 3);
    for (const v of variants) {
      expect(v.body.toLowerCase()).not.toContain('revolutionary');
      expect(v.body.toLowerCase()).not.toContain('game-changing');
      expect(v.body.toLowerCase()).not.toContain('guaranteed customers');
    }
  });

  it('generateIdeas returns the requested count', async () => {
    const ideas = await templateProvider.generateIdeas({ pillarName: 'Advice for providers', count: 3, launch });
    expect(ideas).toHaveLength(3);
  });

  it('is deterministic for the same input', async () => {
    const a = await templateProvider.generatePostDraft(brief());
    const b = await templateProvider.generatePostDraft(brief());
    expect(a.body).toBe(b.body);
  });
});
