import { prisma } from '../prisma.js';
import { encrypt, decrypt } from '../crypto.js';
import { logger } from '../logger.js';
import { env } from '../../config/env.js';
import { refreshAccessToken } from './oauth.js';
import type { AnalyticsResult, LinkedinClient, PublishInput, PublishResult } from './client.js';

// Real official-API client (§5, §18) — Posts API for publishing, the
// Community Management API's share-statistics endpoint for analytics.
// Selected only when MOCK_LINKEDIN_API=false, LINKEDIN_PUBLISHING_ENABLED=true,
// and a CONNECTED LinkedinConnection with a publishing-allowed organization
// exists — otherwise lib/linkedin/index.ts falls back to notConnectedClient.
//
// UNTESTED against the live LinkedIn API in this build environment (no
// outbound network access here). Implemented per LinkedIn's publicly
// documented Posts API / Community Management API request shapes as
// faithfully as possible — verify the first real connect + first real
// publish yourself; see docs/marketing-agent/KNOWN_LIMITATIONS.md.

const API_BASE = 'https://api.linkedin.com';

async function getActiveConnectionAndOrg() {
  const connection = await prisma.linkedinConnection.findFirst({
    where: { connectionStatus: 'CONNECTED' },
    orderBy: { updatedAt: 'desc' },
    include: { organizations: { where: { publishingAllowed: true } } },
  });
  const org = connection?.organizations[0];
  return { connection, org };
}

// Decrypts and, if within 60s of expiry, refreshes the access token in place
// (updating the encrypted value stored in the database).
async function getFreshAccessToken(connectionId: number): Promise<string | null> {
  const connection = await prisma.linkedinConnection.findUnique({ where: { id: connectionId } });
  if (!connection?.encryptedAccessToken) return null;

  const expiringSoon = connection.accessTokenExpiresAt ? connection.accessTokenExpiresAt.getTime() - Date.now() < 60_000 : false;
  if (!expiringSoon) return decrypt(connection.encryptedAccessToken);

  if (!connection.encryptedRefreshToken) {
    await prisma.linkedinConnection.update({ where: { id: connectionId }, data: { connectionStatus: 'EXPIRED' } });
    return null;
  }
  try {
    const refreshed = await refreshAccessToken(decrypt(connection.encryptedRefreshToken));
    await prisma.linkedinConnection.update({
      where: { id: connectionId },
      data: {
        encryptedAccessToken: encrypt(refreshed.accessToken),
        encryptedRefreshToken: refreshed.refreshToken ? encrypt(refreshed.refreshToken) : connection.encryptedRefreshToken,
        accessTokenExpiresAt: new Date(Date.now() + refreshed.expiresInSeconds * 1000),
      },
    });
    return refreshed.accessToken;
  } catch (err) {
    logger.error({ err, connectionId }, 'LinkedIn token refresh failed; marking connection expired.');
    await prisma.linkedinConnection.update({ where: { id: connectionId }, data: { connectionStatus: 'EXPIRED' } });
    return null;
  }
}

export function apiHeaders(accessToken: string) {
  return {
    authorization: `Bearer ${accessToken}`,
    'content-type': 'application/json',
    'LinkedIn-Version': env.LINKEDIN_API_VERSION,
    'X-Restli-Protocol-Version': '2.0.0',
  };
}

export const realLinkedinClient: LinkedinClient = {
  isMock: false,

  async getConnectionStatus() {
    const { connection, org } = await getActiveConnectionAndOrg();
    if (!connection || !org) return { connected: false };
    return { connected: true, organizationName: org.displayName };
  },

  async publishPost(input: PublishInput): Promise<PublishResult> {
    const { connection, org } = await getActiveConnectionAndOrg();
    if (!connection || !org) {
      return { success: false, errorCode: 'not_connected', safeErrorMessage: 'No connected LinkedIn organization with publishing permission.', retryable: false };
    }
    const accessToken = await getFreshAccessToken(connection.id);
    if (!accessToken) {
      return { success: false, errorCode: 'token_expired', safeErrorMessage: 'LinkedIn access token expired and could not be refreshed. Reconnect LinkedIn.', retryable: false };
    }

    // Posts API request shape (author = organization URN). Link posts use
    // the `content.article` variant; text-only posts omit `content` (§18
    // MVP priority: text-only and link posts first).
    const body: Record<string, unknown> = {
      author: org.linkedinOrganizationUrn,
      commentary: input.body,
      visibility: 'PUBLIC',
      distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    };
    if (input.destinationUrl) {
      body.content = { article: { source: input.destinationUrl } };
    }

    let res: Response;
    try {
      res = await fetch(`${API_BASE}/rest/posts`, { method: 'POST', headers: apiHeaders(accessToken), body: JSON.stringify(body) });
    } catch (err) {
      logger.warn({ err }, 'LinkedIn publish request failed (network)');
      return { success: false, errorCode: 'transient', safeErrorMessage: 'Network error contacting LinkedIn.', retryable: true };
    }

    const requestId = res.headers.get('x-li-uuid') ?? res.headers.get('x-request-id') ?? undefined;

    if (res.status === 429) {
      return { success: false, errorCode: 'rate_limited', safeErrorMessage: 'LinkedIn rate limit reached.', retryable: true, providerResponseCode: res.status, requestId };
    }
    if (res.status === 401) {
      return { success: false, errorCode: 'token_expired', safeErrorMessage: 'LinkedIn rejected the access token.', retryable: false, providerResponseCode: res.status, requestId };
    }
    if (res.status === 403) {
      return { success: false, errorCode: 'insufficient_permission', safeErrorMessage: 'LinkedIn reports insufficient permission to publish for this organization.', retryable: false, providerResponseCode: res.status, requestId };
    }
    if (res.status >= 500) {
      return { success: false, errorCode: 'transient', safeErrorMessage: `LinkedIn server error (${res.status}).`, retryable: true, providerResponseCode: res.status, requestId };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      logger.warn({ status: res.status, body: text.slice(0, 500) }, 'LinkedIn publish rejected');
      return { success: false, errorCode: 'rejected', safeErrorMessage: `LinkedIn rejected the post (${res.status}).`, retryable: false, providerResponseCode: res.status, requestId };
    }

    // The Posts API returns the created post's id via a response header
    // rather than a JSON body (x-restli-id, or x-linkedin-id on some
    // API versions) — check both defensively.
    const postId = res.headers.get('x-restli-id') ?? res.headers.get('x-linkedin-id');
    if (!postId) {
      logger.error('LinkedIn publish returned 2xx but no post id header — treating as failed so it is never silently lost.');
      return { success: false, errorCode: 'rejected', safeErrorMessage: 'LinkedIn accepted the request but returned no post identifier.', retryable: false, providerResponseCode: res.status, requestId };
    }
    const urn = postId.startsWith('urn:') ? postId : `urn:li:share:${postId}`;
    return {
      success: true,
      linkedinPostUrn: urn,
      publishedUrl: `https://www.linkedin.com/feed/update/${urn}/`,
      organizationUrn: org.linkedinOrganizationUrn,
      requestId,
      providerResponseCode: res.status,
      retryable: false,
    };
  },

  async fetchAnalytics(linkedinPostUrn: string): Promise<AnalyticsResult> {
    const { connection, org } = await getActiveConnectionAndOrg();
    if (!connection || !org) throw new Error('No connected LinkedIn organization.');
    const accessToken = await getFreshAccessToken(connection.id);
    if (!accessToken) throw new Error('LinkedIn access token unavailable.');

    const url = new URL(`${API_BASE}/rest/organizationalEntityShareStatistics`);
    url.searchParams.set('q', 'organizationalEntity');
    url.searchParams.set('organizationalEntity', org.linkedinOrganizationUrn);
    url.searchParams.set('shares[0]', linkedinPostUrn);

    const res = await fetch(url.toString(), { headers: apiHeaders(accessToken) });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`LinkedIn analytics request failed: ${res.status} ${text.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      elements?: { totalShareStatistics?: { impressionCount?: number; uniqueImpressionsCount?: number; likeCount?: number; commentCount?: number; shareCount?: number; clickCount?: number } }[];
    };
    const stats = data.elements?.[0]?.totalShareStatistics ?? {};
    return {
      impressions: stats.impressionCount ?? 0,
      uniqueImpressions: stats.uniqueImpressionsCount ?? 0,
      reactions: stats.likeCount ?? 0,
      comments: stats.commentCount ?? 0,
      shares: stats.shareCount ?? 0,
      clicks: stats.clickCount ?? 0,
      isSimulated: false,
    };
  },
};
