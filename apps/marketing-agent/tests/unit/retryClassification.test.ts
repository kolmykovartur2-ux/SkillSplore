import { describe, expect, it } from 'vitest';
import { classifyAttempt, MAX_TRANSIENT_ATTEMPTS } from '../../src/lib/linkedin/retryClassification.js';

describe('classifyAttempt', () => {
  it('classifies success', () => {
    expect(classifyAttempt({ success: true, retryable: false }, 1)).toEqual({ attemptStatus: 'SUCCESS', willRetry: false });
  });

  it('classifies rate_limited as transient and retryable under the cap', () => {
    const result = classifyAttempt({ success: false, errorCode: 'rate_limited', retryable: true }, 1);
    expect(result).toEqual({ attemptStatus: 'FAILED_TRANSIENT', willRetry: true });
  });

  it('stops retrying once MAX_TRANSIENT_ATTEMPTS is reached', () => {
    const result = classifyAttempt({ success: false, errorCode: 'transient', retryable: true }, MAX_TRANSIENT_ATTEMPTS);
    expect(result.willRetry).toBe(false);
    expect(result.attemptStatus).toBe('FAILED_TRANSIENT');
  });

  it('classifies token_expired as permanent, never retried', () => {
    const result = classifyAttempt({ success: false, errorCode: 'token_expired', retryable: false }, 1);
    expect(result).toEqual({ attemptStatus: 'FAILED_PERMANENT', willRetry: false });
  });

  it('classifies insufficient_permission as permanent', () => {
    expect(classifyAttempt({ success: false, errorCode: 'insufficient_permission', retryable: false }, 1).attemptStatus).toBe('FAILED_PERMANENT');
  });

  it('classifies not_connected as permanent', () => {
    expect(classifyAttempt({ success: false, errorCode: 'not_connected', retryable: false }, 1).attemptStatus).toBe('FAILED_PERMANENT');
  });
});
