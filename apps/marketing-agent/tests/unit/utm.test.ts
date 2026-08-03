import { describe, expect, it } from 'vitest';
import { buildUtmUrl } from '../../src/lib/utm.js';

describe('buildUtmUrl', () => {
  it('adds first-party UTM parameters with sensible defaults', () => {
    const url = buildUtmUrl('https://skillsplore.com/', { campaign: 'founding_tutors', content: 42 });
    const parsed = new URL(url);
    expect(parsed.searchParams.get('utm_source')).toBe('linkedin');
    expect(parsed.searchParams.get('utm_medium')).toBe('organic_social');
    expect(parsed.searchParams.get('utm_campaign')).toBe('founding_tutors');
    expect(parsed.searchParams.get('utm_content')).toBe('42');
  });

  it('never needs personally-identifying content — utm_content is always the numeric id', () => {
    const url = buildUtmUrl('https://skillsplore.com/apply', { campaign: 'early_students', content: 7 });
    expect(url).not.toMatch(/email|name=/i);
  });

  it('preserves an existing path', () => {
    const url = buildUtmUrl('https://skillsplore.com/tutors/apply', { campaign: 'x', content: 1 });
    expect(new URL(url).pathname).toBe('/tutors/apply');
  });
});
