import { describe, expect, it } from 'vitest';
import {
  IMAGE_SAFETY_CONSTRAINTS,
  PERSONAS,
  buildImagePrompt,
  deriveTopicFromDraft,
  findPersona,
  generatedUsageRights,
  suggestPersonaForText,
} from '../../src/lib/imagePrompt.js';

const launch = { country: 'NZ', city: 'Auckland', category: 'Tutoring', stage: 'Pre-launch' };

describe('persona catalogue', () => {
  it('has unique keys so personaKey identifies exactly one persona', () => {
    const keys = PERSONAS.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('covers non-academic skills, not just tutoring', () => {
    const keys = PERSONAS.map((p) => p.key);
    expect(keys).toContain('chef');
    expect(keys).toContain('electronics_teacher');
    expect(keys).toContain('plant_based_cook');
  });

  it('resolves a known key and rejects an unknown one', () => {
    expect(findPersona('maths_tutor')?.label).toBe('Maths tutor');
    expect(findPersona('nope')).toBeUndefined();
  });
});

describe('buildImagePrompt', () => {
  const persona = findPersona('electronics_teacher')!;

  it('is deterministic for the same input', () => {
    const a = buildImagePrompt({ persona, launch });
    const b = buildImagePrompt({ persona, launch });
    expect(a.prompt).toBe(b.prompt);
  });

  it('describes the persona scene and echoes the launch city', () => {
    const built = buildImagePrompt({ persona, launch });
    expect(built.prompt).toContain('electronics teacher');
    expect(built.prompt).toContain('breadboard');
    expect(built.prompt).toContain('Auckland');
    expect(built.personaKey).toBe('electronics_teacher');
  });

  // The safety rules are the whole reason prompt-building lives server-side.
  it('always applies every safety constraint, even with no topic', () => {
    const built = buildImagePrompt({ persona, launch });
    for (const constraint of IMAGE_SAFETY_CONSTRAINTS) {
      expect(built.prompt).toContain(constraint);
    }
    expect(built.negativePrompt).toContain('no children or minors');
    expect(built.negativePrompt).toContain('no recognisable real people or celebrity likenesses');
  });

  it('keeps the constraints when a caller supplies a topic', () => {
    const built = buildImagePrompt({ persona, launch, topic: 'trusted by 10,000 happy students' });
    for (const constraint of IMAGE_SAFETY_CONSTRAINTS) {
      expect(built.prompt).toContain(constraint);
    }
  });

  // A topic is a mood hint. If it leaked through as on-image text it would
  // become a fabricated claim rendered into the creative.
  it('treats a topic as mood only and forbids rendering it as text', () => {
    const built = buildImagePrompt({ persona, launch, topic: 'rated 5 stars' });
    expect(built.prompt).toContain('never through text in the image');
    expect(built.prompt).toContain(
      'no text, numbers, statistics, ratings, star reviews or user counts rendered in the image',
    );
  });

  it('includes the pillar when given one and omits it otherwise', () => {
    expect(buildImagePrompt({ persona, launch, pillarName: 'Advice for providers' }).prompt).toContain(
      'Advice for providers',
    );
    expect(buildImagePrompt({ persona, launch }).prompt).not.toContain('content theme');
  });
});

describe('suggestPersonaForText', () => {
  it('picks the persona the post is actually about', () => {
    expect(suggestPersonaForText('We are looking for soldering and Arduino teachers').key).toBe('electronics_teacher');
    expect(suggestPersonaForText('A note for guitar and piano teachers').key).toBe('music_teacher');
    expect(suggestPersonaForText('Advice on NCEA calculus revision').key).toBe('maths_tutor');
  });

  it('handles the founder’s own car-flipping angle', () => {
    expect(suggestPersonaForText('I have been flipping a car for years but still need a mechanic').key).toBe('craft_maker');
  });

  it('does not fire on a keyword buried inside a longer word', () => {
    // "car" must not match "carefully" — otherwise most posts become craft_maker.
    expect(suggestPersonaForText('We carefully reviewed every profile').key).not.toBe('craft_maker');
  });

  it('falls back to a valid persona when nothing matches', () => {
    const persona = suggestPersonaForText('an entirely unrelated sentence about nothing');
    expect(PERSONAS.map((p) => p.key)).toContain(persona.key);
  });
});

describe('deriveTopicFromDraft', () => {
  it('prefers the title, then the brief’s main idea, then the opening sentence', () => {
    expect(deriveTopicFromDraft({ title: 'A title', mainIdea: 'An idea', body: 'A body.' })).toBe('A title');
    expect(deriveTopicFromDraft({ title: null, mainIdea: 'An idea', body: 'A body.' })).toBe('An idea');
    expect(deriveTopicFromDraft({ title: '  ', mainIdea: null, body: 'First sentence. Second one.' })).toBe(
      'First sentence.',
    );
  });

  it('collapses whitespace and truncates a long opening sentence', () => {
    const topic = deriveTopicFromDraft({ body: `${'word '.repeat(80)}.` });
    expect(topic.length).toBeLessThanOrEqual(160);
    expect(topic).not.toContain('  ');
  });

  it('returns empty string for an empty draft rather than throwing', () => {
    expect(deriveTopicFromDraft({ body: '' })).toBe('');
  });
});

describe('generatedUsageRights', () => {
  it('records the provider and states plainly that nobody real is depicted', () => {
    const rights = generatedUsageRights('openai_compatible', 'gpt-image-1');
    expect(rights).toContain('openai_compatible');
    expect(rights).toContain('gpt-image-1');
    expect(rights).toContain('Depicts no real person');
  });

  it('still reads correctly when the provider reports no model', () => {
    expect(generatedUsageRights('automatic1111', undefined)).not.toContain('()');
  });
});
