import crypto from 'node:crypto';
import { env } from '../../config/env.js';
import { logger } from '../logger.js';
import { upstreamFailed } from '../errors.js';

// Real LinkedIn OAuth 2.0 (3-legged, authorization code + PKCE) — §5, §28.
// Only the official, documented flow: no scraping, no stored passwords, no
// browser automation. Endpoints below are LinkedIn's standard OAuth surface
// (stable and unlikely to change independently of the rest of their API).
//
// IMPORTANT: this file has not been exercised against a live LinkedIn app in
// this build environment (no outbound network access here, and no live
// Development-Tier credentials to test with). It follows LinkedIn's publicly
// documented OAuth + Posts API shapes as faithfully as possible, but the
// founder should treat the first real connect + first real publish as the
// actual verification step — see docs/marketing-agent/KNOWN_LIMITATIONS.md.

const AUTHORIZATION_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';

// Minimum necessary permissions (§5, §37) — never request more.
export const LINKEDIN_SCOPES = ['w_organization_social', 'r_organization_social', 'r_organization_admin'];

export function generateState(): string {
  return crypto.randomBytes(24).toString('base64url');
}

export function generatePkcePair(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

export function buildAuthorizationUrl(state: string, codeChallenge: string): string {
  const url = new URL(AUTHORIZATION_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', env.LINKEDIN_CLIENT_ID);
  url.searchParams.set('redirect_uri', env.LINKEDIN_REDIRECT_URI);
  url.searchParams.set('state', state);
  url.searchParams.set('scope', LINKEDIN_SCOPES.join(' '));
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

// LinkedIn answers a failed token call with an OAuth error object
// ({error, error_description}) and no token, so its body is safe to log and to
// show the founder — and it is usually the only thing that explains the
// failure (e.g. "unauthorized_scope_error" when the app has not been approved
// for the Community Management API product yet).
async function describeFailure(res: Response, what: string): Promise<Error> {
  const text = await res.text().catch(() => '');
  let detail = text.slice(0, 300);
  try {
    const parsed = JSON.parse(text) as { error?: string; error_description?: string };
    if (parsed.error || parsed.error_description) {
      detail = [parsed.error, parsed.error_description].filter(Boolean).join(': ');
    }
  } catch {
    /* not JSON — fall back to the raw text above */
  }
  logger.warn({ status: res.status, detail }, `LinkedIn ${what} failed`);
  return upstreamFailed(`LinkedIn ${what} failed (HTTP ${res.status}): ${detail || 'no detail returned'}`, 'linkedin_error');
}

export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresInSeconds: number;
  scope?: string;
}

export async function exchangeCodeForToken(code: string, codeVerifier: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: env.LINKEDIN_REDIRECT_URI,
    client_id: env.LINKEDIN_CLIENT_ID,
    client_secret: env.LINKEDIN_CLIENT_SECRET,
    code_verifier: codeVerifier,
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw await describeFailure(res, 'token exchange');
  const data = (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number; scope?: string };
  return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresInSeconds: data.expires_in, scope: data.scope };
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: env.LINKEDIN_CLIENT_ID,
    client_secret: env.LINKEDIN_CLIENT_SECRET,
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw await describeFailure(res, 'token refresh');
  const data = (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number };
  return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresInSeconds: data.expires_in };
}
