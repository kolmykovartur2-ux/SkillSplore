import { describe, expect, it } from 'vitest';
import { runWithFallback } from '../../src/lib/contentGenerationProvider.js';
import { templateProvider } from '../../src/lib/providers/templateProvider.js';
import type { ContentGenerationProvider } from '../../src/lib/contentGenerationProvider.js';

function fakeProvider(name: string, behavior: 'succeed' | 'fail'): ContentGenerationProvider {
  const impl = () => (behavior === 'succeed' ? Promise.resolve('ok') : Promise.reject(new Error('provider unreachable')));
  return {
    name,
    generateIdeas: impl as never,
    generateBrief: impl as never,
    generatePostDraft: impl as never,
    generateVariants: impl as never,
    rewriteDraft: impl as never,
    createImageBrief: impl as never,
    createCampaignPlan: impl as never,
    classifyContentPillar: impl as never,
    evaluateDraft: impl as never,
  };
}

describe('runWithFallback', () => {
  it('uses the primary provider when it succeeds, no fallback', async () => {
    const primary = fakeProvider('anthropic', 'succeed');
    const { result, providerUsed, fellBackToTemplate } = await runWithFallback(primary, templateProvider, (p) => p.generateIdeas({} as never));
    expect(result).toBe('ok');
    expect(providerUsed).toBe('anthropic');
    expect(fellBackToTemplate).toBe(false);
  });

  it('falls back to template (not a silent wrong-provider swap — flagged) when the primary throws', async () => {
    const primary = fakeProvider('anthropic', 'fail');
    const fallback = fakeProvider('template', 'succeed');
    const { providerUsed, fellBackToTemplate } = await runWithFallback(primary, fallback, (p) => p.generateIdeas({} as never));
    expect(providerUsed).toBe('template');
    expect(fellBackToTemplate).toBe(true);
  });

  it('skips the try/catch entirely when primary already is the fallback (template mode)', async () => {
    const { providerUsed, fellBackToTemplate } = await runWithFallback(templateProvider, templateProvider, (p) =>
      p.classifyContentPillar({ text: 'x', pillarNames: ['Building SkillSplore'] }),
    );
    expect(providerUsed).toBe('template');
    expect(fellBackToTemplate).toBe(false);
  });
});
