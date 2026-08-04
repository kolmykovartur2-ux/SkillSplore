// Named creative formulas for post generation.
//
// The brand rules in promptUtils.ts are almost entirely prohibitions — they
// stop the copy lying, but nothing in them makes it *interesting*, which is
// why unguided output drifts into safe corporate mush. An angle supplies the
// missing half: a specific structure to write into.
//
// Pure data plus a pure prompt-fragment builder, so the exact instruction sent
// to a model is reviewable and unit-testable, exactly like imagePrompt.ts.

export interface CreativeAngle {
  key: string;
  label: string;
  /** One line the founder sees in the dashboard. */
  summary: string;
  /** The structure the post should follow. */
  formula: string[];
  /** Why this shape earns attention — given to the model as reasoning, not decoration. */
  whyItWorks: string;
  /** Angle-specific cautions, layered on top of the global brand rules. */
  cautions?: string[];
}

export const CREATIVE_ANGLES: CreativeAngle[] = [
  {
    key: 'founder_story',
    label: 'Founder story (real skill, honest gap)',
    summary:
      'First person. A skill the founder genuinely has, a gap in it they will admit to, and the marketplace as the bridge to someone further along.',
    formula: [
      'Open with a concrete, specific thing the founder actually does — named plainly, no preamble.',
      'Show real competence in it with a small specific detail, not a boast.',
      'Admit the honest limit: the part they still get wrong or have to guess at.',
      'Make that gap the reason the marketplace should exist — someone out there is further along.',
      'Close with a genuine question or a specific ask, not a slogan.',
    ],
    whyItWorks:
      'Admitting a limit in a skill you visibly have is credible in a way that claiming expertise is not, and it demonstrates the product from the inside: even competent people want someone further along. It is also personal enough for the founder to reshare from their own profile without it reading as an advert.',
    cautions: [
      'Only use personal details that appear in the supplied facts. Never invent a hobby, a history, a number of years, or an anecdote.',
      'The gap must be real and specific, not false modesty ("I am just too passionate").',
    ],
  },
  {
    key: 'overlooked_skill',
    label: 'The skill nobody thinks of as teachable',
    summary: 'Challenges the assumption that learning means school subjects, by taking an everyday practical skill seriously.',
    formula: [
      'Name a practical skill people learn informally and badly.',
      'Show why the self-taught route is slow or expensive.',
      'Point out that someone nearby already knows this properly.',
      'Invite people who teach that skill, or want to learn it, to say so.',
    ],
    whyItWorks:
      'It widens what the reader thinks the marketplace is for, and it is surprising: most people never considered paying someone to teach them this.',
  },
  {
    key: 'specific_problem',
    label: 'One small, recognisable problem',
    summary: 'A single concrete frustration, described precisely enough that the right reader feels seen.',
    formula: [
      'Describe one narrow situation in concrete detail.',
      'Do not generalise it into a market-size claim.',
      'Say what would actually help.',
      'Say what is being built towards that, honestly and modestly.',
    ],
    whyItWorks: 'Specificity is what makes a reader stop. A precise small problem beats a vague large one.',
  },
  {
    key: 'behind_the_build',
    label: 'Behind the build',
    summary: 'What was tried, what broke, and what changed as a result.',
    formula: [
      'State the decision or the thing that broke.',
      'Explain the reasoning, including what was wrong about it.',
      'Say what changed.',
      'Ask whether others would have done it differently.',
    ],
    whyItWorks:
      'Working in the open earns trust before there is a product to judge, and mistakes are more readable than successes.',
    cautions: ['Do not turn a small fix into a triumph. The tone is a note from the workshop, not a press release.'],
  },
  {
    key: 'myth_vs_reality',
    label: 'Myth vs reality',
    summary: 'Takes a common assumption about learning or teaching and corrects it plainly.',
    formula: [
      'State the assumption fairly, as its holders would.',
      'Give the honest counterpoint.',
      'Avoid strawmen — the assumption should be one reasonable people hold.',
      'Land on what this means for someone reading.',
    ],
    whyItWorks: 'Disagreement is interesting, and stating the other side fairly first is what stops it reading as cheap.',
  },
  {
    key: 'open_question',
    label: 'A question actually being asked',
    summary: 'A genuine open question the founder does not yet know the answer to.',
    formula: [
      'Give just enough context for the question to make sense.',
      'Ask one clear question.',
      'Say why the answer matters to what is being built.',
      'Stop. Do not answer it.',
    ],
    whyItWorks: 'A real question invites a reply. A rhetorical one invites a scroll.',
    cautions: ['If the answer is already known, this is the wrong angle — it will read as fake consultation.'],
  },
];

export function findCreativeAngle(key: string): CreativeAngle | undefined {
  return CREATIVE_ANGLES.find((a) => a.key === key);
}

/**
 * Renders an angle as a prompt fragment. Kept separate from the angle data so
 * the wording sent to a provider is testable without a network call.
 */
export function buildAnglePrompt(angle: CreativeAngle): string {
  const lines = [
    `Write this post using the "${angle.label}" angle.`,
    `Structure it as: ${angle.formula.map((step, i) => `(${i + 1}) ${step}`).join(' ')}`,
    `Why this angle works: ${angle.whyItWorks}`,
  ];
  if (angle.cautions?.length) {
    lines.push(`Specific cautions for this angle: ${angle.cautions.join(' ')}`);
  }
  return lines.join('\n');
}
