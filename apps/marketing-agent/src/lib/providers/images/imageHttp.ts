import { logger } from '../../logger.js';

// Shared HTTP plumbing for the image providers.
//
// Exists because Node's fetch throws a bare TypeError("fetch failed") when a
// host is unreachable, which tells the founder nothing — and "the image server
// isn't running" is by far the most common failure for a self-hosted setup.
// Both providers need identical handling, so it lives here rather than being
// duplicated and drifting.

// undici wraps the real problem in `cause`, and that cause frequently carries
// the useful part in `code` (ECONNREFUSED, ENOTFOUND) with an empty message —
// so take the first field that actually says something, and print nothing at
// all rather than a bare "()" when none of them do.
function describeCause(err: unknown): string {
  const candidates: unknown[] = [];
  if (err instanceof Error) {
    const cause = (err as Error & { cause?: unknown }).cause;
    if (cause instanceof Error) {
      candidates.push((cause as Error & { code?: unknown }).code, cause.message);
    } else if (cause !== undefined) {
      candidates.push(cause);
    }
    candidates.push((err as Error & { code?: unknown }).code, err.message);
  } else if (err !== undefined && err !== null) {
    candidates.push(err);
  }
  const found = candidates.find((c) => typeof c === 'string' && c.trim().length > 0);
  return typeof found === 'string' ? found.trim() : '';
}

export async function postForImage(
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
  } catch (err) {
    logger.warn({ url, err }, 'Could not reach the image provider');
    const detail = describeCause(err);
    throw new Error(
      `Could not reach the image provider at ${url} — is it running and reachable from this service?${detail ? ` (${detail})` : ''}`,
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    logger.warn({ status: res.status, body: text.slice(0, 300) }, 'Image generation request failed');
    throw new Error(`Image provider error (HTTP ${res.status}): ${text.slice(0, 200) || 'no detail returned'}`);
  }

  return res.json();
}
