import { afterEach, describe, expect, it, vi } from 'vitest';
import { postForImage } from '../../src/lib/providers/images/imageHttp.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('postForImage', () => {
  // Node's fetch throws a bare TypeError("fetch failed") when nothing is
  // listening, which is useless to a founder running a local image server.
  it('explains an unreachable endpoint instead of passing "fetch failed" through', async () => {
    const networkError = new TypeError('fetch failed');
    (networkError as Error & { cause?: unknown }).cause = new Error('connect ECONNREFUSED 127.0.0.1:7860');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(networkError);

    await expect(postForImage('http://localhost:7860/sdapi/v1/txt2img', {})).rejects.toThrow(
      /Could not reach the image provider at http:\/\/localhost:7860/,
    );
    await expect(postForImage('http://localhost:7860/sdapi/v1/txt2img', {})).rejects.toThrow(/ECONNREFUSED/);
  });

  // undici often reports the useful part as cause.code with an empty message.
  it('uses the cause code when the cause message is empty', async () => {
    const networkError = new TypeError('fetch failed');
    const cause = new Error('');
    (cause as Error & { code?: string }).code = 'ECONNREFUSED';
    (networkError as Error & { cause?: unknown }).cause = cause;
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(networkError);

    await expect(postForImage('http://localhost:7860/x', {})).rejects.toThrow(/\(ECONNREFUSED\)/);
  });

  // Better to say nothing than to print a confusing empty "()".
  it('omits the parenthetical entirely when nothing useful is available', async () => {
    const bare = new TypeError('');
    (bare as Error & { cause?: unknown }).cause = new Error('');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(bare);

    await expect(postForImage('http://localhost:7860/x', {})).rejects.toThrow(/reachable from this service\?$/);
  });

  it('reports the provider’s status and body on a non-OK response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{"error":"content_policy_violation"}', { status: 400 }),
    );

    await expect(postForImage('http://example.test/v1/images/generations', {})).rejects.toThrow(
      /HTTP 400.*content_policy_violation/s,
    );
  });

  it('returns the parsed body on success', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"images":["abc"]}', { status: 200 }));

    await expect(postForImage('http://example.test/x', {})).resolves.toEqual({ images: ['abc'] });
  });
});
