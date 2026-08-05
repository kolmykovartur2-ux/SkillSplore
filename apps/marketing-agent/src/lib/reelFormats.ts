// Short-form video format specifications.
//
// The hard part of a reel is not the footage — it is the hook and the beat
// structure. That is the same creative problem the angles system solves for
// written posts, so this file supplies the platform-specific *constraints* and
// leaves the creative shaping to creativeAngles.ts.
//
// Pure data plus a pure prompt-fragment builder, testable without a network
// call, exactly like imagePrompt.ts and creativeAngles.ts.

export interface ReelFormat {
  key: string;
  label: string;
  aspectRatio: string;
  /** Seconds. Short-form dies or survives in this window. */
  hookMaxSeconds: number;
  targetDurationSeconds: [number, number];
  beatCount: [number, number];
  /** How the platform's audience actually watches. */
  viewingContext: string;
  captionStyle: string;
  cautions: string[];
}

export const REEL_FORMATS: ReelFormat[] = [
  {
    key: 'linkedin_video',
    label: 'LinkedIn native video',
    aspectRatio: '9:16 (1:1 also acceptable)',
    hookMaxSeconds: 3,
    targetDurationSeconds: [30, 90],
    beatCount: [3, 5],
    viewingContext:
      'Scrolled in a professional feed, almost always muted, often at a desk. The viewer will read before they listen, and will give it slightly longer than a consumer feed would.',
    captionStyle:
      'Burned-in captions throughout, since most plays are silent. Full sentences are fine. Keep on-screen text to one short line at a time.',
    cautions: [
      'Avoid consumer-app trend formats and trending-audio dependence; they read as out of place here.',
      'A talking head speaking plainly outperforms heavy editing on this platform.',
    ],
  },
  {
    key: 'reels_shortform',
    label: 'Instagram Reels / TikTok',
    aspectRatio: '9:16',
    hookMaxSeconds: 1.5,
    targetDurationSeconds: [15, 45],
    beatCount: [3, 6],
    viewingContext:
      'Scrolled fast in a consumer feed with sound sometimes on. The first frame and the first spoken half-sentence decide everything; there is no patience for preamble.',
    captionStyle:
      'Short bold on-screen text, a few words per beat, timed to the cut. Captions carry the story on their own.',
    cautions: [
      'The hook must land before the first full sentence finishes. Never open with a greeting or an introduction.',
      'Cut on the beat — a static shot for more than a few seconds loses the viewer.',
    ],
  },
];

export function findReelFormat(key: string): ReelFormat | undefined {
  return REEL_FORMATS.find((f) => f.key === key);
}

// Constraints that hold whatever the platform, mirroring the written-content
// rules. Motion makes some of these easier to breach than a still image does:
// an actor delivering a line reads as a testimonial far more strongly than the
// same words typed in a post.
export const REEL_SAFETY_CONSTRAINTS = [
  'Never script a person presenting themselves as a SkillSplore user, tutor, customer or success story — that is a fabricated testimonial whether spoken or written.',
  'No on-screen statistics, user counts, ratings or review counts. SkillSplore is pre-launch and has none.',
  'No screen recordings implying activity that does not exist — no populated dashboards, feeds or message threads.',
  'No income, outcome, health or guaranteed-result claims.',
  'Every factual claim spoken or shown must come from the supplied facts. If no fact supports it, cut the line.',
  'If generated imagery is used in any shot, it must be labelled as illustrative on screen.',
];

export function buildReelFormatPrompt(format: ReelFormat): string {
  return [
    `Target platform: ${format.label} (${format.aspectRatio}).`,
    `How it is watched: ${format.viewingContext}`,
    `The hook must land within ${format.hookMaxSeconds} seconds.`,
    `Total length: ${format.targetDurationSeconds[0]}–${format.targetDurationSeconds[1]} seconds, in ${format.beatCount[0]}–${format.beatCount[1]} beats.`,
    `Captions: ${format.captionStyle}`,
    `Platform cautions: ${format.cautions.join(' ')}`,
    `Hard rules: ${REEL_SAFETY_CONSTRAINTS.join(' ')}`,
  ].join('\n');
}

export interface ReelBeat {
  /** What is said aloud, if anything. */
  spoken: string;
  /** The words that appear on screen — short. */
  onScreenText: string;
  /** What the camera actually sees, so it can be filmed on a phone. */
  shot: string;
}

export interface ShortFormScript {
  platformKey: string;
  /** The first line, which has to earn the rest. */
  hook: string;
  beats: ReelBeat[];
  /** The post caption that accompanies the video. */
  caption: string;
  hashtags: string[];
  filmingNotes: string[];
}

/**
 * Renders a script into the plain text stored on a ContentDraft, so short-form
 * scripts pass through exactly the same versioning, warning, review and
 * approval machinery as written posts rather than needing a parallel system.
 */
export function renderScriptToBody(script: ShortFormScript, format: ReelFormat): string {
  const lines = [
    `${format.label} — ${format.aspectRatio}, target ${format.targetDurationSeconds[0]}–${format.targetDurationSeconds[1]}s`,
    '',
    `HOOK (first ${format.hookMaxSeconds}s):`,
    script.hook,
    '',
    'SHOT LIST:',
  ];

  script.beats.forEach((beat, i) => {
    lines.push(`${i + 1}. SHOT: ${beat.shot}`);
    if (beat.spoken?.trim()) lines.push(`   SAY: ${beat.spoken.trim()}`);
    if (beat.onScreenText?.trim()) lines.push(`   ON SCREEN: ${beat.onScreenText.trim()}`);
    lines.push('');
  });

  lines.push('CAPTION:', script.caption);

  if (script.hashtags.length) {
    lines.push('', script.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' '));
  }
  if (script.filmingNotes.length) {
    lines.push('', 'FILMING NOTES:', ...script.filmingNotes.map((n) => `- ${n}`));
  }

  return lines.join('\n');
}
