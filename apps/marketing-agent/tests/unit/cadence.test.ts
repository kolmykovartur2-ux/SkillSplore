import { describe, expect, it } from 'vitest';
import { checkCadenceConflicts } from '../../src/lib/cadence.js';

describe('checkCadenceConflicts', () => {
  it('has no conflicts against an empty schedule', () => {
    expect(checkCadenceConflicts(new Date('2026-03-02T21:00:00Z'), [])).toEqual([]);
  });

  it('flags less than 18 hours from another scheduled post', () => {
    const existing = [new Date('2026-03-02T21:00:00Z')]; // Mon 10:00 NZDT
    const tooClose = new Date('2026-03-03T02:00:00Z'); // 5 hours later
    expect(checkCadenceConflicts(tooClose, existing).length).toBeGreaterThan(0);
  });

  it('allows 18+ hours apart on different days', () => {
    const existing = [new Date('2026-03-02T21:00:00Z')]; // Mon 10:00 NZDT
    const farEnough = new Date('2026-03-04T09:00:00Z'); // ~2 days later
    expect(checkCadenceConflicts(farEnough, existing)).toEqual([]);
  });

  it('flags a second post on the same local calendar day even when 18+ hours apart', () => {
    // Both fall on local (Pacific/Auckland, NZDT = UTC+13) March 3: 00:30 and 23:30 — 23 hours
    // apart in real time (passes the gap check on its own) but still the same calendar day.
    const existing = [new Date('2026-03-02T11:30:00Z')]; // local March 3, 00:30
    const sameDayLater = new Date('2026-03-03T10:30:00Z'); // local March 3, 23:30
    const conflicts = checkCadenceConflicts(sameDayLater, existing);
    expect(conflicts.some((c) => c.message.includes('per day'))).toBe(true);
  });
});
