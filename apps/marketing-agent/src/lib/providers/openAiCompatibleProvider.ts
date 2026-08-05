import { env } from '../../config/env.js';
import { logger } from '../logger.js';
import { BRAND_VOICE_SYSTEM_PROMPT, buildUserPrompt, parseJsonResponse } from './promptUtils.js';
import type { ShortFormScript } from '../reelFormats.js';
import type {
  BriefInput,
  BriefSeed,
  ContentGenerationProvider,
  GeneratedDraft,
  IdeaSeed,
  ImageBrief,
} from '../contentGenerationProvider.js';

// Any OpenAI-compatible chat completions endpoint (self-hosted vLLM/LM
// Studio/text-generation-webui, or a commercial provider that exposes the
// same shape) — used only when CONTENT_AI_PROVIDER=openai_compatible. This is
// the "another commercial LLM provider" adapter required by §15, generalised
// to the widely-supported OpenAI wire format rather than one specific vendor.

async function call(userPrompt: string): Promise<string> {
  if (!env.OPENAI_COMPATIBLE_BASE_URL) {
    throw new Error('CONTENT_AI_PROVIDER=openai_compatible requires OPENAI_COMPATIBLE_BASE_URL.');
  }
  const url = `${env.OPENAI_COMPATIBLE_BASE_URL.replace(/\/$/, '')}/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(env.CONTENT_AI_API_KEY ? { authorization: `Bearer ${env.CONTENT_AI_API_KEY}` } : {}),
    },
    body: JSON.stringify({
      model: env.CONTENT_AI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: BRAND_VOICE_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    logger.warn({ status: res.status, body }, 'OpenAI-compatible content-generation request failed');
    throw new Error(`OpenAI-compatible API error: ${res.status}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('OpenAI-compatible response had no message content.');
  return text;
}

export const openAiCompatibleProvider: ContentGenerationProvider = {
  name: 'openai_compatible',

  async generateIdeas(input) {
    const text = await call(buildUserPrompt('Generate content ideas as a JSON array of {title, notes}.', input));
    return parseJsonResponse<IdeaSeed[]>(text);
  },

  async generateBrief(input) {
    const text = await call(
      buildUserPrompt(
        'Generate a content brief as a JSON object with keys: objective, audience, mainIdea, productStage, desiredReaderAction, tone, format, maxLength.',
        input,
      ),
    );
    return parseJsonResponse<BriefSeed>(text);
  },

  async generatePostDraft(input: BriefInput) {
    const text = await call(
      buildUserPrompt('Write one LinkedIn post as a JSON object {title, body, contentType}. Ground every claim only in facts provided.', input),
    );
    return parseJsonResponse<GeneratedDraft>(text);
  },

  async generateVariants(input: BriefInput, count = 3) {
    const text = await call(
      buildUserPrompt(`Write ${count} distinct LinkedIn post variants as a JSON array of {title, body, contentType}.`, input),
    );
    return parseJsonResponse<GeneratedDraft[]>(text);
  },

  async rewriteDraft(input) {
    const text = await call(buildUserPrompt('Rewrite this LinkedIn post per the instruction. Return JSON {body, contentType}.', input));
    return parseJsonResponse<GeneratedDraft>(text);
  },

  async createImageBrief(input) {
    const text = await call(
      buildUserPrompt('Write a visual brief (not an image) as JSON {description, mustInclude, mustAvoid}. Never invent fake data on screen.', input),
    );
    return parseJsonResponse<ImageBrief>(text);
  },

  async generateShortFormScript(input) {
    const text = await call(
      buildUserPrompt(
        'Write a short-form video script as a JSON object {hook, beats, caption, hashtags, filmingNotes}. beats is an array of {spoken, onScreenText, shot}. The hook is the very first line and must earn the rest. Ground every claim only in the facts provided.',
        input,
      ),
    );
    const parsed = parseJsonResponse<Omit<ShortFormScript, 'platformKey'>>(text);
    return { ...parsed, platformKey: input.platformKey };
  },

  async createCampaignPlan(input) {
    const text = await call(buildUserPrompt('Plan a campaign as a JSON array of {title, notes} post ideas.', input));
    return parseJsonResponse<IdeaSeed[]>(text);
  },

  async classifyContentPillar(input) {
    const text = await call(buildUserPrompt('Return JSON {pillar: string} naming the best-matching pillar from pillarNames.', input));
    return parseJsonResponse<{ pillar: string }>(text).pillar;
  },

  async evaluateDraft(input) {
    const text = await call(
      buildUserPrompt('Evaluate this draft for truthfulness, modesty, and brand fit. Return JSON {notes: string[]}.', input),
    );
    return parseJsonResponse<{ notes: string[] }>(text);
  },
};
