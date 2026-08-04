import { describe, expect, it } from 'vitest';
import { CREATIVE_ANGLES, buildAnglePrompt, findCreativeAngle } from '../../src/lib/creativeAngles.js';
import { buildUserPrompt, BRAND_VOICE_SYSTEM_PROMPT } from '../../src/lib/providers/promptUtils.js';

describe('creative angle catalogue', () => {
  it('has unique keys and complete guidance for every angle', () => {
    const keys = CREATIVE_ANGLES.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const angle of CREATIVE_ANGLES) {
      expect(angle.formula.length).toBeGreaterThan(1);
      expect(angle.whyItWorks.length).toBeGreaterThan(20);
      expect(angle.summary.length).toBeGreaterThan(10);
    }
  });

  it('resolves a known key and rejects an unknown one', () => {
    expect(findCreativeAngle('founder_story')?.label).toContain('Founder story');
    expect(findCreativeAngle('nope')).toBeUndefined();
  });
});

describe('the founder-story angle', () => {
  const angle = findCreativeAngle('founder_story')!;

  it('encodes the real-skill / honest-gap / bridge structure', () => {
    const prompt = buildAnglePrompt(angle);
    expect(prompt).toMatch(/honest limit|still get wrong/i);
    expect(prompt).toMatch(/further along/i);
  });

  // This angle is the one most likely to tempt a model into inventing a
  // biography, so its caution has to travel with it into the prompt.
  it('forbids inventing personal details it was not given', () => {
    const prompt = buildAnglePrompt(angle);
    expect(prompt).toMatch(/Never invent a hobby, a history/i);
    expect(prompt).toMatch(/only use personal details that appear in the supplied facts/i);
  });
});

describe('buildAnglePrompt', () => {
  it('numbers the formula steps so the structure survives into the prompt', () => {
    const prompt = buildAnglePrompt(findCreativeAngle('specific_problem')!);
    expect(prompt).toContain('(1)');
    expect(prompt).toContain('(2)');
  });

  it('omits the cautions line for an angle that has none', () => {
    const noCautions = CREATIVE_ANGLES.find((a) => !a.cautions?.length);
    if (noCautions) expect(buildAnglePrompt(noCautions)).not.toContain('Specific cautions');
  });
});

describe('buildUserPrompt', () => {
  // Escaped inside a JSON string field an instruction reads as trivia; it has
  // to sit above the payload to be followed.
  it('hoists the angle instruction above the JSON payload', () => {
    const prompt = buildUserPrompt('Write a post.', { mainIdea: 'x', angleInstruction: 'ANGLE-MARKER' });
    expect(prompt.indexOf('ANGLE-MARKER')).toBeLessThan(prompt.indexOf('Input (JSON):'));
  });

  it('changes nothing when no angle is supplied', () => {
    const prompt = buildUserPrompt('Write a post.', { mainIdea: 'x' });
    expect(prompt).toBe('Task: Write a post.\n\nInput (JSON):\n' + JSON.stringify({ mainIdea: 'x' }, null, 2));
  });

  it('ignores a blank angle rather than emitting empty lines', () => {
    expect(buildUserPrompt('T', { angleInstruction: '   ' })).toContain('Task: T\n\nInput (JSON):');
  });
});

describe('brand voice prompt', () => {
  it('keeps the truthfulness rules', () => {
    expect(BRAND_VOICE_SYSTEM_PROMPT).toMatch(/Never invent user counts/i);
    expect(BRAND_VOICE_SYSTEM_PROMPT).toMatch(/Only use facts explicitly provided/i);
  });

  // The prohibitions alone produced safe, forgettable copy; craft guidance is
  // what makes the output worth reading.
  it('also tells the writer how to be worth reading', () => {
    expect(BRAND_VOICE_SYSTEM_PROMPT).toMatch(/first line must earn the second/i);
    expect(BRAND_VOICE_SYSTEM_PROMPT).toMatch(/One idea per post/i);
    expect(BRAND_VOICE_SYSTEM_PROMPT).toMatch(/concrete nouns/i);
  });

  it('does not let modesty become an excuse for vagueness', () => {
    expect(BRAND_VOICE_SYSTEM_PROMPT).toMatch(/Modesty is not an excuse for vagueness/i);
  });
});
