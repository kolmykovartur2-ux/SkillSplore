import crypto from 'node:crypto';
import type { AnalyticsResult, LinkedinClient, PublishInput, PublishResult } from './client.js';

// Demo/test double only (§35 — "demo mode must never connect to the real
// SkillSplore Page"). Simulates a fake organization and always-successful
// publication so the whole generate -> review -> approve -> schedule ->
// publish -> analytics loop can be exercised end to end with zero external
// dependency. All figures it returns are clearly marked isSimulated: true.

function seededNumber(seed: string, min: number, max: number): number {
  const hash = crypto.createHash('sha256').update(seed).digest();
  const value = hash.readUInt32BE(0) / 0xffffffff;
  return Math.round(min + value * (max - min));
}

export const mockLinkedinClient: LinkedinClient = {
  isMock: true,

  async getConnectionStatus() {
    return { connected: true, organizationName: 'SkillSplore (Demo Organization)' };
  },

  async publishPost(input: PublishInput): Promise<PublishResult> {
    const urn = `urn:li:share:demo-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    return {
      success: true,
      linkedinPostUrn: urn,
      publishedUrl: `https://www.linkedin.com/feed/update/${urn}/`,
      organizationUrn: 'urn:li:organization:demo-skillsplore',
      requestId: crypto.randomUUID(),
      providerResponseCode: 201,
      retryable: false,
    };
  },

  async fetchAnalytics(linkedinPostUrn: string): Promise<AnalyticsResult> {
    const impressions = seededNumber(linkedinPostUrn, 40, 900);
    return {
      impressions,
      uniqueImpressions: Math.round(impressions * 0.85),
      reactions: seededNumber(linkedinPostUrn + 'r', 0, Math.max(1, Math.round(impressions * 0.05))),
      comments: seededNumber(linkedinPostUrn + 'c', 0, 8),
      shares: seededNumber(linkedinPostUrn + 's', 0, 4),
      clicks: seededNumber(linkedinPostUrn + 'k', 0, Math.max(1, Math.round(impressions * 0.03))),
      isSimulated: true,
    };
  },
};
