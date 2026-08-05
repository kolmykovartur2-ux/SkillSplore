import type { ShortFormScript } from '../reelFormats.js';
import type {
  BriefInput,
  BriefSeed,
  ContentGenerationProvider,
  GeneratedDraft,
  IdeaSeed,
  ImageBrief,
  LaunchContext,
} from '../contentGenerationProvider.js';
import { evaluateDraftContent } from '../contentValidation.js';

// Deterministic, network-free content generation (§15 "template" mode). This
// is what demo mode and the 12-post launch calendar run on, and it's the
// floor every other provider must not fall below: real structured drafts,
// grounded only in the brief and the launch config actually passed in, never
// inventing numbers, users, or outcomes. No API key, no network access.

function pillarBucket(pillarName: string): keyof typeof PILLAR_OPENINGS {
  const p = pillarName.toLowerCase();
  if (p.includes('building')) return 'building';
  if (p.includes('problem')) return 'problems';
  if (p.includes('customer') || p.includes('advice for customers')) return 'customers';
  if (p.includes('provider')) return 'providers';
  if (p.includes('demonstration') || p.includes('product')) return 'product';
  if (p.includes('recruitment') || p.includes('founding')) return 'recruitment';
  return 'building';
}

const PILLAR_OPENINGS = {
  building: [
    "We're building SkillSplore, and here's an honest update.",
    "A quick note on where SkillSplore is at right now.",
    "Here's something we learned while building SkillSplore this week.",
  ],
  problems: [
    'We noticed a problem worth talking about.',
    "Here's something we keep hearing from the people we've spoken to.",
    'A problem we think is worth solving properly.',
  ],
  customers: [
    "If you're posting a {category} request, this might help.",
    "A few practical notes for anyone looking for {category} help in {city}.",
    'Some thoughts on getting a useful response to a request.',
  ],
  providers: [
    "A few notes for {category} providers thinking about SkillSplore.",
    "If you're a provider considering joining as a founding tutor, here's what to expect.",
    'Some practical guidance for providers writing a profile.',
  ],
  product: [
    "Here's a look at what we've built so far.",
    'A short walkthrough of the current product.',
    "Wanted to show you where SkillSplore's product is at right now.",
  ],
  recruitment: [
    'We are looking for founding tutors.',
    "Calling {category} providers in {city} and beyond.",
    "We'd like to hear from early providers who want to help shape this.",
  ],
} as const;

const CTA_BY_ACTION: { match: RegExp; phrase: string }[] = [
  { match: /founding tutor|join|apply|provider/i, phrase: 'Apply to create an early provider profile if this sounds like you.' },
  { match: /feedback|tell us|hear from|comment/i, phrase: 'Tell us what would make this useful — we read every reply.' },
  { match: /try|test|request/i, phrase: 'Try posting a tutoring request and let us know how it goes.' },
  { match: /follow/i, phrase: 'Follow SkillSplore as we build the first version.' },
  { match: /message|contact/i, phrase: 'Message us if you would like to test it.' },
];

function ctaFor(desiredReaderAction: string, variantIndex: number): string {
  const found = CTA_BY_ACTION.find((c) => c.match.test(desiredReaderAction));
  if (found) return found.phrase;
  const fallback = [
    'Tell us what would make this useful.',
    'Follow along as we build this in public.',
    'Share this with someone it might help.',
  ];
  return fallback[variantIndex % fallback.length]!;
}

function fill(template: string, launch: LaunchContext): string {
  return template
    .replace(/\{category\}/g, launch.category)
    .replace(/\{city\}/g, launch.city)
    .replace(/\{country\}/g, launch.country)
    .replace(/\{stage\}/g, launch.stage.toLowerCase());
}

function hashtagsFor(bucket: keyof typeof PILLAR_OPENINGS, launch: LaunchContext): string[] {
  const tags = ['#SkillSplore'];
  if (bucket === 'building') tags.push('#BuildingInPublic');
  if (bucket === 'recruitment' || bucket === 'customers') {
    if (launch.category.toLowerCase() === 'tutoring') tags.push('#TutoringNZ');
    if (launch.city) tags.push(`#${launch.city.replace(/\s+/g, '')}`);
  }
  return tags.slice(0, 3);
}

function summarizeFacts(facts: BriefInput['facts'], launch: LaunchContext): string {
  const lines = [`Right now we're focused on ${launch.category} in ${launch.city}, ${launch.country} — ${launch.stage.toLowerCase()}.`];
  for (const f of facts.slice(0, 2)) lines.push(`• ${f.value}`);
  return lines.join('\n');
}

function composeBody(brief: BriefInput, variantIndex = 0): string {
  const bucket = pillarBucket(brief.pillarName);
  const openings = PILLAR_OPENINGS[bucket];
  const opening = fill(openings[variantIndex % openings.length]!, brief.launch);
  const mainIdeaLine = brief.mainIdea.trim();
  const factLine = brief.facts.length > 0 ? summarizeFacts(brief.facts, brief.launch) : '';
  const cta = ctaFor(brief.desiredReaderAction, variantIndex);
  const hashtags = hashtagsFor(bucket, brief.launch);

  const lines = [opening, '', mainIdeaLine];
  if (factLine) lines.push('', factLine);
  lines.push('', cta, '', hashtags.join(' '));

  let body = lines.join('\n').trim();
  if (body.length > brief.maxLength) {
    body = body.slice(0, Math.max(0, brief.maxLength - 1)).trimEnd() + '…';
  }
  return body;
}

const IDEA_BANK: Record<keyof typeof PILLAR_OPENINGS, string[]> = {
  building: [
    'What made us start building SkillSplore',
    'A product decision we changed our minds about',
    'What we learned from the first version',
  ],
  problems: [
    'Why finding a specialist by word of mouth is unreliable',
    'The gap between directories and real matching',
    'Why price alone is a poor way to compare providers',
  ],
  customers: [
    'What makes a tutoring request easy to respond to',
    'Direct search vs. posting a request — when to use each',
    'How to compare providers beyond price',
  ],
  providers: [
    'What founding-tutor participation includes',
    'How profile approval works, and what it does not mean',
    'Why providers set their own rates on SkillSplore',
  ],
  product: [
    'A walkthrough of the search interface',
    'How posting a request works',
    'What a provider profile looks like today',
  ],
  recruitment: [
    'A call for founding tutors in Auckland and online',
    'Which subjects we are looking for first',
    'What we ask of founding providers, and what we do not',
  ],
};

async function ideasForPillar(pillarName: string, count: number): Promise<IdeaSeed[]> {
  const bucket = pillarBucket(pillarName);
  const bank = IDEA_BANK[bucket];
  return Array.from({ length: count }, (_, i) => ({
    title: bank[i % bank.length]!,
    notes: `Generated in template mode for the "${pillarName}" pillar. Review before use.`,
  }));
}

export const templateProvider: ContentGenerationProvider = {
  name: 'template',

  async generateIdeas({ pillarName, count }) {
    return ideasForPillar(pillarName, count);
  },

  async generateBrief({ pillarName, ideaTitle, launch }): Promise<BriefSeed> {
    const bucket = pillarBucket(pillarName);
    const audienceByBucket: Record<string, string> = {
      building: 'Followers interested in how SkillSplore is built',
      problems: 'Anyone who has struggled to find specialised help',
      customers: `Students and parents in ${launch.city} and online across ${launch.country}`,
      providers: `${launch.category} providers considering SkillSplore`,
      product: 'Followers curious about the product itself',
      recruitment: `${launch.category} providers in ${launch.city} and online`,
    };
    const actionByBucket: Record<string, string> = {
      building: 'Follow along and share feedback',
      problems: 'Tell us if this matches their experience',
      customers: 'Try posting a request',
      providers: 'Apply to become a founding provider',
      product: 'Try the feature and share feedback',
      recruitment: 'Apply to create an early provider profile',
    };
    return {
      objective: `Explain: ${ideaTitle}`,
      audience: audienceByBucket[bucket]!,
      mainIdea: ideaTitle,
      productStage: launch.stage,
      desiredReaderAction: actionByBucket[bucket]!,
      tone: 'Honest, modest, practical',
      format: 'TEXT_ONLY',
      maxLength: 1200,
    };
  },

  async generatePostDraft(input: BriefInput): Promise<GeneratedDraft> {
    return { body: composeBody(input, 0), contentType: input.format };
  },

  async generateVariants(input: BriefInput, count = 3): Promise<GeneratedDraft[]> {
    return Array.from({ length: count }, (_, i) => ({ body: composeBody(input, i), contentType: input.format }));
  },

  async rewriteDraft({ body, instruction, maxLength }): Promise<GeneratedDraft> {
    // Template mode cannot creatively rewrite without an LLM; it appends the
    // requested change as a visible editorial note rather than silently
    // guessing at a rewrite, so the founder always edits the real words.
    const note = `\n\n[Template mode: requested change — "${instruction}" — edit the text above by hand.]`;
    const trimmed = body.length + note.length > maxLength ? body.slice(0, Math.max(0, maxLength - note.length)) : body;
    return { body: trimmed + note, contentType: 'TEXT_ONLY' };
  },

  async createImageBrief({ topic, pillarName }): Promise<ImageBrief> {
    return {
      description: `A real, unedited screenshot or photo illustrating "${topic}" (pillar: ${pillarName}). No mockups of features that do not exist yet.`,
      mustInclude: ['SkillSplore logo mark or wordmark', 'Genuine product UI or a real, consented photo'],
      mustAvoid: ['Fabricated user counts, reviews, or testimonials', 'Stock photography that misrepresents the team or product'],
    };
  },

  // Template mode cannot invent a hook, so it does the next most useful thing:
  // emits a correctly-structured filming scaffold with the platform's own
  // constraints filled in. Useless as finished copy, genuinely useful as a
  // checklist to film against — and it keeps the reel flow working with no AI
  // provider configured at all.
  async generateShortFormScript(input): Promise<ShortFormScript> {
    const { launch, mainIdea, desiredReaderAction, audience } = input;
    return {
      platformKey: input.platformKey,
      hook: `[Write the hook here — one concrete line about "${mainIdea}". No greeting, no introduction.]`,
      beats: [
        {
          spoken: `[State the specific situation for ${audience}, in one sentence.]`,
          onScreenText: '[3-5 words]',
          shot: 'Talking head, chest up, natural light, plain background.',
        },
        {
          spoken: '[Give one concrete detail that proves you actually know this.]',
          onScreenText: '[3-5 words]',
          shot: 'Cutaway to the thing being talked about — hands, tools, or the object itself.',
        },
        {
          spoken: '[Name the honest limit, or the part people get wrong.]',
          onScreenText: '[3-5 words]',
          shot: 'Back to talking head.',
        },
        {
          spoken: `[Close: ${desiredReaderAction}.]`,
          onScreenText: '[Short call to action]',
          shot: 'Talking head, slightly closer.',
        },
      ],
      caption: `[Caption: one or two lines expanding the hook, ending on a real question. ${launch.category} in ${launch.city}, ${launch.country}. ${launch.stage}.]`,
      hashtags: [],
      filmingNotes: [
        'Template mode produced this scaffold — it is a structure to film against, not finished copy.',
        'Set CONTENT_AI_PROVIDER to anthropic or openai_compatible for a written hook and script.',
        'Film vertically. Check the hook works with the sound off.',
      ],
    };
  },

  async createCampaignPlan({ goal, pillarNames, postCount, launch }): Promise<IdeaSeed[]> {
    const plan: IdeaSeed[] = [];
    for (let i = 0; i < postCount; i++) {
      const pillarName = pillarNames[i % pillarNames.length]!;
      const [idea] = await ideasForPillar(pillarName, 1);
      plan.push({ title: idea!.title, notes: `Campaign goal: ${goal}. Launch context: ${launch.category} in ${launch.city}.` });
    }
    return plan;
  },

  async classifyContentPillar({ text, pillarNames }) {
    const lower = text.toLowerCase();
    const scored = pillarNames.map((name) => ({
      name,
      score: pillarBucket(name) === pillarBucket(lower) ? 1 : 0,
    }));
    return scored.sort((a, b) => b.score - a.score)[0]?.name ?? pillarNames[0] ?? '';
  },

  async evaluateDraft({ body }) {
    const warnings = evaluateDraftContent({
      body,
      maxLength: 3000,
      hasUnverifiedClaims: false,
      recentDraftBodies: [],
    });
    return { notes: warnings.map((w) => w.message) };
  },
};
