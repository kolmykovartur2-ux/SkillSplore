import { describe, expect, it } from 'vitest';
import {
  REEL_FORMATS,
  REEL_SAFETY_CONSTRAINTS,
  buildReelFormatPrompt,
  findReelFormat,
  renderScriptToBody,
  type ShortFormScript,
} from '../../src/lib/reelFormats.js';

const script: ShortFormScript = {
  platformKey: 'reels_shortform',
  hook: 'Most people overpay by a thousand dollars before they turn the key.',
  beats: [
    { spoken: 'Here is the first thing I check.', onScreenText: 'Check this first', shot: 'Hands on the wheel arch.' },
    { spoken: '', onScreenText: 'Rust hides here', shot: 'Close-up of the sill.' },
  ],
  caption: 'What do you check first?',
  hashtags: ['cars', '#auckland'],
  filmingNotes: ['Film vertically.'],
};

describe('reel format catalogue', () => {
  it('has unique keys and covers both target platforms', () => {
    const keys = REEL_FORMATS.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain('linkedin_video');
    expect(keys).toContain('reels_shortform');
  });

  it('gives the consumer feed a much tighter hook window than LinkedIn', () => {
    const linkedin = findReelFormat('linkedin_video')!;
    const reels = findReelFormat('reels_shortform')!;
    expect(reels.hookMaxSeconds).toBeLessThan(linkedin.hookMaxSeconds);
  });

  it('rejects an unknown platform key', () => {
    expect(findReelFormat('myspace')).toBeUndefined();
  });
});

describe('buildReelFormatPrompt', () => {
  it('carries the platform constraints into the prompt', () => {
    const prompt = buildReelFormatPrompt(findReelFormat('reels_shortform')!);
    expect(prompt).toContain('9:16');
    expect(prompt).toMatch(/hook must land within 1\.5 seconds/);
  });

  // Motion makes a fabricated testimonial far easier to produce than text does,
  // so these must ride along with every script request.
  it('always includes every safety constraint', () => {
    for (const format of REEL_FORMATS) {
      const prompt = buildReelFormatPrompt(format);
      for (const constraint of REEL_SAFETY_CONSTRAINTS) {
        expect(prompt).toContain(constraint);
      }
    }
  });

  it('forbids scripting someone as a SkillSplore user', () => {
    expect(buildReelFormatPrompt(REEL_FORMATS[0]!)).toMatch(/fabricated testimonial whether spoken or written/);
  });
});

describe('renderScriptToBody', () => {
  const body = renderScriptToBody(script, findReelFormat('reels_shortform')!);

  it('renders a filmable shot list with the hook first', () => {
    expect(body.indexOf('HOOK')).toBeLessThan(body.indexOf('SHOT LIST:'));
    expect(body).toContain('1. SHOT: Hands on the wheel arch.');
    expect(body).toContain('SAY: Here is the first thing I check.');
    expect(body).toContain('ON SCREEN: Rust hides here');
  });

  it('omits the SAY line for a silent beat rather than printing an empty label', () => {
    const secondBeat = body.slice(body.indexOf('2. SHOT:'));
    expect(secondBeat).not.toContain('SAY:');
  });

  it('normalises hashtags so a mixed list renders consistently', () => {
    expect(body).toContain('#cars #auckland');
  });

  it('includes the caption and filming notes', () => {
    expect(body).toContain('What do you check first?');
    expect(body).toContain('- Film vertically.');
  });
});
