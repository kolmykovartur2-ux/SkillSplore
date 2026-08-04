import { env } from '../../../config/env.js';
import type { GeneratedImage, ImageGenerationProvider } from '../../imageGenerationProvider.js';
import type { BuiltImagePrompt } from '../../imagePrompt.js';
import { postForImage } from './imageHttp.js';

// Any endpoint speaking the OpenAI /images/generations shape — OpenAI itself,
// or a self-hosted gateway (LocalAI, LiteLLM, and similar) that mimics it.
// Chosen over a single vendor SDK for the same reason as the text adapter: the
// wire format is a de-facto standard, so one adapter covers many back ends and
// none of them become a hard dependency.

export const openAiCompatibleImageProvider: ImageGenerationProvider = {
  name: 'openai_compatible',

  get configured() {
    return Boolean(env.IMAGE_AI_BASE_URL);
  },

  async generateImage(prompt: BuiltImagePrompt): Promise<GeneratedImage> {
    if (!env.IMAGE_AI_BASE_URL) {
      throw new Error('IMAGE_AI_PROVIDER=openai_compatible requires IMAGE_AI_BASE_URL.');
    }
    const model = env.IMAGE_AI_MODEL || 'gpt-image-1';
    const url = `${env.IMAGE_AI_BASE_URL.replace(/\/$/, '')}/images/generations`;

    const data = (await postForImage(
      url,
      {
        model,
        prompt: prompt.prompt,
        n: 1,
        size: env.IMAGE_AI_SIZE,
        // b64 keeps the bytes on this server's own network path rather than
        // relying on a short-lived vendor CDN URL we would have to re-fetch.
        response_format: 'b64_json',
      },
      env.IMAGE_AI_API_KEY ? { authorization: `Bearer ${env.IMAGE_AI_API_KEY}` } : {},
    )) as {
      data?: { b64_json?: string; url?: string; revised_prompt?: string }[];
    };
    const first = data.data?.[0];
    if (!first?.b64_json) {
      // Some gateways ignore response_format and return a URL instead.
      if (first?.url) throw new Error('Image provider returned a URL instead of base64 data; set response_format support or use a different endpoint.');
      throw new Error('Image provider returned no image data.');
    }

    return {
      bytes: Buffer.from(first.b64_json, 'base64'),
      mimeType: 'image/png',
      model,
      revisedPrompt: first.revised_prompt,
    };
  },
};
