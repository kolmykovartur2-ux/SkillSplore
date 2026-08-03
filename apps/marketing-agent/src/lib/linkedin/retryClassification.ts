import type { PublishResult } from './client.js';

// Pure, DB/network-free retry classification — extracted from
// publish.service.ts so it's directly unit-testable (§34: "retry
// classification" is an explicitly required test).

export const MAX_TRANSIENT_ATTEMPTS = 3;
const TRANSIENT_ERROR_CODES = new Set<NonNullable<PublishResult['errorCode']>>(['rate_limited', 'transient']);

export interface AttemptClassification {
  attemptStatus: 'SUCCESS' | 'FAILED_TRANSIENT' | 'FAILED_PERMANENT';
  willRetry: boolean;
}

export function classifyAttempt(result: PublishResult, attemptNumber: number): AttemptClassification {
  if (result.success) return { attemptStatus: 'SUCCESS', willRetry: false };
  const isTransient = result.errorCode ? TRANSIENT_ERROR_CODES.has(result.errorCode) : false;
  const willRetry = isTransient && attemptNumber < MAX_TRANSIENT_ATTEMPTS;
  return { attemptStatus: isTransient ? 'FAILED_TRANSIENT' : 'FAILED_PERMANENT', willRetry };
}
