import type { AnalyticsResult, LinkedinClient, PublishResult } from './client.js';

// Draft-only mode's LinkedIn client (§5: "the application must be useful in
// draft-only mode"). Real OAuth + the official Posts API is Phase 6+ and not
// implemented in this build — this client makes that limitation explicit and
// safe rather than silently failing or, worse, pretending to succeed.

export const notConnectedClient: LinkedinClient = {
  isMock: false,

  async getConnectionStatus() {
    return { connected: false };
  },

  async publishPost(): Promise<PublishResult> {
    return {
      success: false,
      errorCode: 'not_connected',
      safeErrorMessage:
        'LinkedIn is not connected. Real publication requires a connected company page (see docs/marketing-agent/LINKEDIN_SETUP.md) — not yet built in this release; see KNOWN_LIMITATIONS.md.',
      retryable: false,
    };
  },

  async fetchAnalytics(): Promise<AnalyticsResult> {
    throw new Error('LinkedIn is not connected; no analytics available.');
  },
};
