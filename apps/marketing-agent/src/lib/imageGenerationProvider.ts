import { env } from '../config/env.js';
import { openAiCompatibleImageProvider } from './providers/images/openAiCompatibleImageProvider.js';
import { automatic1111ImageProvider } from './providers/images/automatic1111ImageProvider.js';
import type { BuiltImagePrompt } from './imagePrompt.js';

// Same sovereignty boundary as contentGenerationProvider.ts (§15): nothing
// downstream imports a vendor SDK, and the service is fully functional with no
// image provider configured at all — IMAGE_AI_PROVIDER defaults to "none".
//
// Deliberately NOT given a template/offline fallback the way text generation
// is: a placeholder image silently standing in for a real one could be
// published without anyone noticing. Text has a deterministic fallback that is
// still genuinely useful; a fake image is not, so "none" fails loudly instead.

export interface GeneratedImage {
  bytes: Buffer;
  mimeType: string;
  model?: string;
  /** Some providers rewrite the prompt; recorded for provenance when they do. */
  revisedPrompt?: string;
}

export interface ImageGenerationProvider {
  readonly name: string;
  readonly configured: boolean;
  generateImage(prompt: BuiltImagePrompt): Promise<GeneratedImage>;
}

export const disabledImageProvider: ImageGenerationProvider = {
  name: 'none',
  configured: false,
  async generateImage() {
    throw new Error(
      'No image provider is configured. Set IMAGE_AI_PROVIDER (openai_compatible or automatic1111) plus its base URL/API key. See docs/marketing-agent/IMAGE_GENERATION.md.',
    );
  },
};

function selectImageProvider(): ImageGenerationProvider {
  switch (env.IMAGE_AI_PROVIDER) {
    case 'openai_compatible':
      return openAiCompatibleImageProvider;
    case 'automatic1111':
      return automatic1111ImageProvider;
    case 'none':
    default:
      return disabledImageProvider;
  }
}

export const configuredImageProvider = selectImageProvider();
