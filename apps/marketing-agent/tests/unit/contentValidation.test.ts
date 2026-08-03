import { describe, expect, it } from 'vitest';
import { evaluateDraftContent } from '../../src/lib/contentValidation.js';

describe('evaluateDraftContent', () => {
  it('flags banned exaggerated language', () => {
    const warnings = evaluateDraftContent({
      body: 'SkillSplore is the number-one platform for tutoring.',
      maxLength: 3000,
      hasUnverifiedClaims: false,
      recentDraftBodies: [],
    });
    expect(warnings.some((w) => w.category === 'exaggerated_language')).toBe(true);
  });

  it('flags banned calls to action', () => {
    const warnings = evaluateDraftContent({
      body: 'Sign up before it is too late!',
      maxLength: 3000,
      hasUnverifiedClaims: false,
      recentDraftBodies: [],
    });
    expect(warnings.some((w) => w.category === 'banned_cta')).toBe(true);
  });

  it('flags more than three hashtags', () => {
    const warnings = evaluateDraftContent({
      body: 'Building in public. #SkillSplore #Auckland #Tutoring #NZ #Startup #Growth',
      maxLength: 3000,
      hasUnverifiedClaims: false,
      recentDraftBodies: [],
    });
    expect(warnings.some((w) => w.category === 'hashtags')).toBe(true);
  });

  it('flags a body over the brief maxLength', () => {
    const warnings = evaluateDraftContent({
      body: 'x'.repeat(50),
      maxLength: 10,
      hasUnverifiedClaims: false,
      recentDraftBodies: [],
    });
    expect(warnings.some((w) => w.category === 'length')).toBe(true);
  });

  it('flags an unsupported numeric claim only when the brief has no approved evidence', () => {
    const body = 'We now have 500 tutors on the platform.';
    const withUnverified = evaluateDraftContent({ body, maxLength: 3000, hasUnverifiedClaims: true, recentDraftBodies: [] });
    const withVerified = evaluateDraftContent({ body, maxLength: 3000, hasUnverifiedClaims: false, recentDraftBodies: [] });
    expect(withUnverified.some((w) => w.category === 'unsupported_claim')).toBe(true);
    expect(withVerified.some((w) => w.category === 'unsupported_claim')).toBe(false);
  });

  it('flags a near-duplicate of a recent draft', () => {
    const previous = 'We are building SkillSplore to help students find great local tutors easily.';
    const warnings = evaluateDraftContent({
      body: 'We are building SkillSplore to help students find great local tutors easily today.',
      maxLength: 3000,
      hasUnverifiedClaims: false,
      recentDraftBodies: [previous],
    });
    expect(warnings.some((w) => w.category === 'repetition')).toBe(true);
  });

  it('returns no warnings for a clean, modest post', () => {
    const warnings = evaluateDraftContent({
      body: 'We are building SkillSplore and would like to hear from founding tutors. #SkillSplore',
      maxLength: 3000,
      hasUnverifiedClaims: false,
      recentDraftBodies: [],
    });
    expect(warnings).toEqual([]);
  });
});
