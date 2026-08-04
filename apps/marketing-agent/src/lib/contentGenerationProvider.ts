import { env } from '../config/env.js';
import { logger } from './logger.js';
import { templateProvider } from './providers/templateProvider.js';
import { anthropicProvider } from './providers/anthropicProvider.js';
import { openAiCompatibleProvider } from './providers/openAiCompatibleProvider.js';
import { ollamaProvider } from './providers/ollamaProvider.js';

// Sovereignty boundary (§15): everything downstream of this file talks only
// to this interface, never to a specific vendor SDK. Swapping
// CONTENT_AI_PROVIDER is the only thing that changes which vendor is called.
// "template" needs no network access at all and is what demo mode and the
// launch calendar use, so the service is fully useful with zero AI provider
// configured.

export interface LaunchContext {
  country: string;
  city: string;
  category: string;
  stage: string;
}

export interface FactRef {
  key: string;
  value: string;
  source: string;
}

export interface IdeaSeed {
  title: string;
  notes: string;
}

export interface BriefSeed {
  objective: string;
  audience: string;
  mainIdea: string;
  productStage: string;
  desiredReaderAction: string;
  tone: string;
  format: string;
  maxLength: number;
}

export interface BriefInput {
  objective: string;
  audience: string;
  pillarName: string;
  mainIdea: string;
  productStage: string;
  desiredReaderAction: string;
  tone: string;
  format: string;
  maxLength: number;
  facts: FactRef[];
  launch: LaunchContext;
  /**
   * Optional creative formula (src/lib/creativeAngles.ts) shaping how the post
   * is written. Rendered to a prompt fragment by the caller so providers stay
   * unaware of the angle catalogue itself.
   */
  angleInstruction?: string;
}

export interface GeneratedDraft {
  title?: string;
  body: string;
  contentType: string;
}

export interface ImageBrief {
  description: string;
  mustInclude: string[];
  mustAvoid: string[];
}

export interface ContentGenerationProvider {
  readonly name: string;
  generateIdeas(input: { pillarName: string; count: number; launch: LaunchContext }): Promise<IdeaSeed[]>;
  generateBrief(input: { pillarName: string; ideaTitle: string; launch: LaunchContext }): Promise<BriefSeed>;
  generatePostDraft(input: BriefInput): Promise<GeneratedDraft>;
  generateVariants(input: BriefInput, count?: number): Promise<GeneratedDraft[]>;
  rewriteDraft(input: { body: string; instruction: string; maxLength: number }): Promise<GeneratedDraft>;
  createImageBrief(input: { topic: string; pillarName: string }): Promise<ImageBrief>;
  createCampaignPlan(input: {
    goal: string;
    pillarNames: string[];
    postCount: number;
    launch: LaunchContext;
  }): Promise<IdeaSeed[]>;
  classifyContentPillar(input: { text: string; pillarNames: string[] }): Promise<string>;
  evaluateDraft(input: { body: string }): Promise<{ notes: string[] }>;
}

function selectConfiguredProvider(): ContentGenerationProvider {
  switch (env.CONTENT_AI_PROVIDER) {
    case 'anthropic':
      return anthropicProvider;
    case 'openai_compatible':
      return openAiCompatibleProvider;
    case 'ollama':
      return ollamaProvider;
    case 'template':
    default:
      return templateProvider;
  }
}

export const configuredProvider = selectConfiguredProvider();

// Runtime fallback: a network provider can fail per-request (bad key, network
// down, model retired) long after boot succeeded. Rather than surface a hard
// 500 to the founder, fall back to the deterministic template provider and
// say so loudly in the response + logs — never a silent swap.
//
// Pure/DI'd core (`runWithFallback`) so it's directly unit-testable with fake
// providers, independent of the module-level `configuredProvider` singleton
// that `withProviderFallback` wires it up to for real use.
export async function runWithFallback<T>(
  primary: ContentGenerationProvider,
  fallback: ContentGenerationProvider,
  fn: (provider: ContentGenerationProvider) => Promise<T>,
): Promise<{ result: T; providerUsed: string; fellBackToTemplate: boolean }> {
  if (primary.name === fallback.name) {
    return { result: await fn(primary), providerUsed: primary.name, fellBackToTemplate: false };
  }
  try {
    const result = await fn(primary);
    return { result, providerUsed: primary.name, fellBackToTemplate: false };
  } catch (err) {
    logger.warn({ err, provider: primary.name }, 'Configured content-generation provider failed; falling back to template mode for this request.');
    const result = await fn(fallback);
    return { result, providerUsed: fallback.name, fellBackToTemplate: true };
  }
}

export async function withProviderFallback<T>(
  fn: (provider: ContentGenerationProvider) => Promise<T>,
): Promise<{ result: T; providerUsed: string; fellBackToTemplate: boolean }> {
  return runWithFallback(configuredProvider, templateProvider, fn);
}
