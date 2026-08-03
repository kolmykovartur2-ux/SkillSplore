import { describe, expect, it } from 'vitest';
import { localWallTimeToUtc, hoursBetween } from '../../src/lib/timezone.js';

describe('localWallTimeToUtc', () => {
  it('converts a NZ standard-time (winter, UTC+12) wall clock time to UTC', () => {
    // 1 July 09:00 in Pacific/Auckland is NZST (UTC+12) -> 1 July 21:00 UTC (previous... same day, 21:00Z)
    const utc = localWallTimeToUtc({ year: 2026, month: 7, day: 1, hour: 9, minute: 0 }, 'Pacific/Auckland');
    expect(utc.toISOString()).toBe('2026-06-30T21:00:00.000Z');
  });

  it('converts a NZ daylight-time (summer, UTC+13) wall clock time to UTC', () => {
    // 1 January 09:00 in Pacific/Auckland is NZDT (UTC+13)
    const utc = localWallTimeToUtc({ year: 2026, month: 1, day: 1, hour: 9, minute: 0 }, 'Pacific/Auckland');
    expect(utc.toISOString()).toBe('2025-12-31T20:00:00.000Z');
  });

  it('round-trips through UTC unchanged', () => {
    const utc = localWallTimeToUtc({ year: 2026, month: 3, day: 15, hour: 12, minute: 30 }, 'UTC');
    expect(utc.toISOString()).toBe('2026-03-15T12:30:00.000Z');
  });
});

describe('hoursBetween', () => {
  it('computes absolute hours between two dates', () => {
    const a = new Date('2026-01-01T00:00:00Z');
    const b = new Date('2026-01-01T18:00:00Z');
    expect(hoursBetween(a, b)).toBe(18);
    expect(hoursBetween(b, a)).toBe(18);
  });
});
