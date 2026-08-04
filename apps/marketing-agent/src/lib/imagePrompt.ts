import type { LaunchContext } from './contentGenerationProvider.js';

// Deterministic prompt construction for generated post imagery.
//
// Kept as pure functions with no network access so the exact wording sent to
// an image model is unit-testable and reviewable — the same reasoning behind
// contentValidation.ts. Which vendor renders the prompt is a separate concern
// (imageGenerationProvider.ts); this file decides *what* is asked for.

export interface Persona {
  key: string;
  label: string;
  /** Who is depicted, in the third person and deliberately non-specific. */
  subject: string;
  setting: string;
  props: string[];
  /** Lowercase cues used to pick a persona straight from a draft's own words. */
  keywords: string[];
}

// A deliberately broad catalogue: the point of the imagery is that SkillSplore
// is for any skill, not only academic tutoring. Extend freely — nothing else
// in the codebase hard-codes these keys.
export const PERSONAS: Persona[] = [
  {
    key: 'maths_tutor',
    label: 'Maths tutor',
    subject: 'an adult maths tutor mid-explanation',
    setting: 'a bright, tidy study space with a whiteboard',
    props: ['handwritten equations on a whiteboard', 'notebook and pen', 'a laptop to one side'],
    keywords: ['maths', 'math', 'algebra', 'calculus', 'exam', 'tutor', 'homework', 'study', 'ncea'],
  },
  {
    key: 'plant_based_cook',
    label: 'Plant-based cooking coach',
    subject: 'an adult plant-based cooking coach preparing a colourful vegetable dish',
    setting: 'a warm, naturally lit home kitchen',
    props: ['fresh vegetables on a wooden board', 'a chef’s knife', 'simple ceramic bowls'],
    keywords: ['vegan', 'plant-based', 'vegetarian', 'nutrition', 'healthy eating', 'wholefood'],
  },
  {
    key: 'chef',
    label: 'Chef / cooking teacher',
    subject: 'an adult chef demonstrating a technique to camera',
    setting: 'a clean professional-style kitchen bench',
    props: ['a pan on a stovetop', 'prepped ingredients in small bowls', 'a folded tea towel'],
    keywords: ['cook', 'cooking', 'chef', 'recipe', 'kitchen', 'baking', 'knife skills', 'food'],
  },
  {
    key: 'electronics_teacher',
    label: 'Electronics teacher',
    subject: 'an adult electronics teacher pointing at a small circuit build',
    setting: 'a workbench with good task lighting',
    props: ['a breadboard with jumper wires', 'a multimeter', 'a soldering iron on its stand'],
    keywords: ['electronics', 'circuit', 'arduino', 'soldering', 'robotics', 'raspberry pi', 'wiring'],
  },
  {
    key: 'music_teacher',
    label: 'Music teacher',
    subject: 'an adult music teacher demonstrating a chord',
    setting: 'a relaxed practice room',
    props: ['an acoustic guitar', 'a music stand with sheet music'],
    keywords: ['music', 'guitar', 'piano', 'singing', 'drums', 'instrument', 'chord'],
  },
  {
    key: 'language_tutor',
    label: 'Language tutor',
    subject: 'an adult language tutor speaking during an online lesson',
    setting: 'a calm desk setup with a headset',
    props: ['a laptop showing a neutral video-call layout', 'flashcards', 'a mug'],
    keywords: ['language', 'english', 'spanish', 'mandarin', 'te reo', 'esol', 'conversation practice'],
  },
  {
    key: 'fitness_coach',
    label: 'Fitness coach',
    subject: 'an adult fitness coach demonstrating a stretch',
    setting: 'an uncluttered studio space with natural light',
    props: ['a yoga mat', 'a water bottle'],
    keywords: ['fitness', 'gym', 'yoga', 'strength', 'training', 'pilates', 'stretch'],
  },
  {
    key: 'craft_maker',
    label: 'Craft / maker teacher',
    subject: 'an adult craft teacher showing a work-in-progress piece',
    setting: 'a creative workshop table',
    props: ['hand tools laid out neatly', 'raw materials', 'a partly finished project'],
    keywords: ['craft', 'woodwork', 'sewing', 'pottery', 'maker', 'diy', 'restoration', 'car', 'mechanic', 'welding'],
  },
];

export function findPersona(key: string): Persona | undefined {
  return PERSONAS.find((p) => p.key === key);
}

/**
 * Picks the persona whose keywords the draft's own words hit most often, so
 * "Generate image" on a post about soldering doesn't hand back a maths tutor.
 * Deliberately a plain keyword count rather than a model call: it must be
 * deterministic, instant, and work in template mode with no AI provider.
 * Falls back to the first persona when nothing matches.
 */
export function suggestPersonaForText(text: string): Persona {
  const haystack = ` ${text.toLowerCase()} `;
  let best = PERSONAS[0]!;
  let bestScore = 0;
  for (const persona of PERSONAS) {
    let score = 0;
    for (const keyword of persona.keywords) {
      // Word-boundary-ish match so "car" doesn't fire on "carefully".
      if (new RegExp(`[^a-z]${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^a-z]`).test(haystack)) score++;
    }
    if (score > bestScore) {
      best = persona;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Reduces a draft to a short mood hint for the image prompt. Prefers the most
 * deliberate summary available (title, then the brief's main idea) before
 * falling back to the opening sentence of the post itself.
 */
export function deriveTopicFromDraft(input: { title?: string | null; mainIdea?: string | null; body: string }): string {
  const candidate =
    [input.title, input.mainIdea].map((c) => c?.trim()).find((c) => c && c.length > 0) ??
    input.body.trim().split(/(?<=[.!?])\s+/)[0] ??
    '';
  const collapsed = candidate.replace(/\s+/g, ' ').trim();
  return collapsed.length > 160 ? `${collapsed.slice(0, 157).trimEnd()}…` : collapsed;
}

// A consistent look across every generated ad, so a set of persona images
// reads as one campaign rather than eight unrelated stock photos.
const HOUSE_STYLE = [
  'natural documentary-style photography',
  'soft diffused daylight',
  'shallow depth of field',
  'uncluttered composition with generous negative space for overlaid text',
  'warm neutral colour palette',
  'candid and understated, not staged corporate stock photography',
].join(', ');

// Hard constraints, applied to every prompt regardless of persona.
//
// These are not stylistic preferences. SkillSplore is pre-launch and its brand
// rules forbid implying activity, users, outcomes or endorsements it does not
// have — an image can make those claims just as loudly as a sentence can, so
// the same restrictions apply here:
//   - a synthetic face must not be passed off as a real tutor or customer,
//     which would be a fabricated testimonial;
//   - on-image numbers, ratings and review counts would be invented evidence;
//   - the marketplace serves minors, so generated marketing imagery avoids
//     depicting children entirely rather than trying to do it tastefully;
//   - health and outcome claims are out of scope for a noticeboard.
export const IMAGE_SAFETY_CONSTRAINTS = [
  'no recognisable real people or celebrity likenesses',
  'no children or minors',
  'no text, numbers, statistics, ratings, star reviews or user counts rendered in the image',
  'no fake user interfaces, dashboards or charts implying activity or results',
  'no brand logos, trademarks or copyrighted characters',
  'no medical, health-outcome, income or guaranteed-result claims',
  'no watermarks or signatures',
];

export interface ImagePromptInput {
  persona: Persona;
  /** Optional post topic to nudge the scene; never a source of factual claims. */
  topic?: string;
  pillarName?: string;
  launch: LaunchContext;
}

export interface BuiltImagePrompt {
  personaKey: string;
  prompt: string;
  negativePrompt: string;
}

export function buildImagePrompt(input: ImagePromptInput): BuiltImagePrompt {
  const { persona, topic, pillarName, launch } = input;

  const scene = [
    `A photograph of ${persona.subject}, in ${persona.setting}.`,
    `Visible details: ${persona.props.join(', ')}.`,
    `The person is an adult, and the image should reflect the everyday diversity of ${launch.city}, ${launch.country}.`,
  ];

  if (topic?.trim()) {
    // Framed as mood only: a topic string must never become an on-image claim.
    scene.push(`Overall mood should suit the theme "${topic.trim()}", conveyed through the scene alone — never through text in the image.`);
  }
  if (pillarName?.trim()) {
    scene.push(`This supports the "${pillarName.trim()}" content theme.`);
  }

  scene.push(`Style: ${HOUSE_STYLE}.`);
  scene.push(`Strict constraints: ${IMAGE_SAFETY_CONSTRAINTS.join('; ')}.`);

  return {
    personaKey: persona.key,
    prompt: scene.join(' '),
    negativePrompt: IMAGE_SAFETY_CONSTRAINTS.join(', '),
  };
}

// What gets written to MediaAsset.usageRights. Generated imagery still has to
// carry documented rights like any other asset (§19) — here the relevant fact
// is that it is synthetic, which model made it, and that it depicts nobody real.
export function generatedUsageRights(providerName: string, model: string | undefined): string {
  const modelPart = model ? ` (${model})` : '';
  return `AI-generated image via ${providerName}${modelPart}. Depicts no real person; not a photograph of a SkillSplore user, tutor or customer. Must be labelled as illustrative if its synthetic nature is not otherwise obvious.`;
}
