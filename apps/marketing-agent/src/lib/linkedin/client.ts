// LinkedIn publishing/analytics interface. The worker and the publish/
// analytics modules depend only on this shape — real OAuth + the official
// Posts API (Phase 6+, requires the founder's own LinkedIn Developer app) is
// a drop-in implementation of the same interface, added later without
// touching the scheduling/approval logic that uses it.

export interface PublishInput {
  body: string;
  destinationUrl?: string;
  mediaAssetKey?: string;
}

export interface PublishResult {
  success: boolean;
  linkedinPostUrn?: string;
  publishedUrl?: string;
  organizationUrn?: string;
  requestId?: string;
  providerResponseCode?: number;
  errorCode?: 'not_connected' | 'token_expired' | 'insufficient_permission' | 'rate_limited' | 'transient' | 'rejected';
  safeErrorMessage?: string;
  retryable: boolean;
}

export interface AnalyticsResult {
  impressions: number;
  uniqueImpressions: number;
  reactions: number;
  comments: number;
  shares: number;
  clicks: number;
  isSimulated: boolean;
}

export interface LinkedinClient {
  readonly isMock: boolean;
  getConnectionStatus(): Promise<{ connected: boolean; organizationName?: string }>;
  publishPost(input: PublishInput): Promise<PublishResult>;
  fetchAnalytics(linkedinPostUrn: string): Promise<AnalyticsResult>;
}
