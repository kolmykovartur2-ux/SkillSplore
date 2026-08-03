import { env } from '../../config/env.js';
import { mockLinkedinClient } from './mockClient.js';
import { notConnectedClient } from './notConnectedClient.js';
import { realLinkedinClient } from './realClient.js';
import type { LinkedinClient } from './client.js';

export type { LinkedinClient, PublishInput, PublishResult, AnalyticsResult } from './client.js';

// Selection order: mock (demo/dev) > real (only when explicitly enabled and
// configured) > not-connected (safe default). A demo/dev box can never
// accidentally hit the real API just because credentials happen to be
// present — MOCK_LINKEDIN_API wins whenever it's true.
export function getLinkedinClient(): LinkedinClient {
  if (env.MOCK_LINKEDIN_API) return mockLinkedinClient;
  if (env.LINKEDIN_PUBLISHING_ENABLED && env.linkedinRealClientConfigured) return realLinkedinClient;
  return notConnectedClient;
}
