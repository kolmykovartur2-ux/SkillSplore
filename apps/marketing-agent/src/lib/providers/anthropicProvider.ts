import { env } from '../../config/env.js';
import { logger } from '../logger.js';
import { BRAND_VOICE_SYSTEM_PROMPT, buildUserPrompt, parseJsonResponse } from './promptUtils.js';
import type {
  BriefInput,
  BriefSeed,
  ContentGenerationProvider,
  GeneratedDraft,
  IdeaSeed,
  ImageBrief,
} from '../contentGenerationProvider.js';

// One of several swappable adapters (§15) — used only when
// CONTENT_AI_PROVIDER=anthropic. Nothing elsewhere in this codebase imports
// this file directly; everything goes through the ContentGenerationProvider
// interface so this vendor can be removed without touching business logic.

const API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-5';

async function call(userPrompt: string): Promise<string> {
  if (!env.CONTENT_AI_API_KEY) {
    throw new Error('CONTENT_AI_PROVIDER=anthropic requires CONTENT_AI_API_KEY.');
  }
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.CONTENT_AI_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: env.CONTENT_AI_MODEL || DEFAULT_MODEL,
      max_tokens: 1500,
      system: BRAND_VOICE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    logger.warn({ status: res.status, body }, 'Anthropic content-generation request failed');
    throw new Error(`Anthropic API error: ${res.status}`);
  }
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = data.content?.find((b) => b.type === 'text')?.text;
  if (!text) throw new Error('Anthropic response had no text content.');
  return text;
}

export const anthropicProvider: ContentGenerationProvider = {
  name: 'anthropic',

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
