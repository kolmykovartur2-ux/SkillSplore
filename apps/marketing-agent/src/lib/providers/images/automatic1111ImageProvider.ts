import { env } from '../../../config/env.js';
import type { GeneratedImage, ImageGenerationProvider } from '../../imageGenerationProvider.js';
import type { BuiltImagePrompt } from '../../imagePrompt.js';
import { postForImage } from './imageHttp.js';

// Self-hosted Stable Diffusion via the AUTOMATIC1111 WebUI API (--api).
//
// The fully sovereign option: runs on hardware you control, needs no API key
// and sends nothing to a third party. Also the only adapter here that can use
// negativePrompt directly — hosted endpoints in the OpenAI shape have no such
// field, so there the constraints are folded into the prompt text instead.

function parseSize(size: string): { width: number; height: number } {
  const match = /^(\d+)x(\d+)$/.exec(size.trim());
  if (!match) return { width: 1024, height: 1024 };
  return { width: Number(match[1]), height: Number(match[2]) };
}

export const automatic1111ImageProvider: ImageGenerationProvider = {
  name: 'automatic1111',

  get configured() {
    return Boolean(env.IMAGE_AI_BASE_URL);
  },

  async generateImage(prompt: BuiltImagePrompt): Promise<GeneratedImage> {
    if (!env.IMAGE_AI_BASE_URL) {
      throw new Error('IMAGE_AI_PROVIDER=automatic1111 requires IMAGE_AI_BASE_URL (e.g. http://localhost:7860).');
    }
    const { width, height } = parseSize(env.IMAGE_AI_SIZE);
    const url = `${env.IMAGE_AI_BASE_URL.replace(/\/$/, '')}/sdapi/v1/txt2img`;

    const data = (await postForImage(url, {
      prompt: prompt.prompt,
      negative_prompt: prompt.negativePrompt,
      width,
      height,
      steps: 30,
      ...(env.IMAGE_AI_MODEL ? { override_settings: { sd_model_checkpoint: env.IMAGE_AI_MODEL } } : {}),
    })) as { images?: string[] };
    const first = data.images?.[0];
    if (!first) throw new Error('Image provider returned no image data.');

    return {
      bytes: Buffer.from(first, 'base64'),
      mimeType: 'image/png',
      model: env.IMAGE_AI_MODEL || undefined,
    };
  },
};
