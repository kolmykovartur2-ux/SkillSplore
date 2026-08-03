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

// A fully local model via Ollama — used only when CONTENT_AI_PROVIDER=ollama.
// This is the adapter that lets SkillSplore generate content with zero data
// leaving the founder's own infrastructure and zero per-token cost.

async function call(userPrompt: string): Promise<string> {
  const url = `${env.OLLAMA_BASE_URL.replace(/\/$/, '')}/api/generate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: env.CONTENT_AI_MODEL || 'llama3.1',
      system: BRAND_VOICE_SYSTEM_PROMPT,
      prompt: userPrompt,
      stream: false,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    logger.warn({ status: res.status, body }, 'Ollama content-generation request failed');
    throw new Error(`Ollama API error: ${res.status}`);
  }
  const data = (await res.json()) as { response?: string };
  if (!data.response) throw new Error('Ollama response had no text.');
  return data.response;
}

export const ollamaProvider: ContentGenerationProvider = {
  name: 'ollama',

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
