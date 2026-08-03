import { env } from '../config/env.js';

// §10 — conservative default posting cadence, stored as configuration
// (constants here; the calendar UI reads them to warn on conflicts). Once
// analytics are available the system may *suggest* a change, but changing
// these still requires a human to actually edit them (§10 last paragraph) —
// there is no auto-apply path in this build.
export const CADENCE = {
  maxPerDay: 1,
  minHoursBetween: 18,
  weeklyTarget: 3,
};

function dateKeyInTimezone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export interface CadenceConflict {
  message: string;
}

export function checkCadenceConflicts(candidateUtc: Date, existingTimes: Date[]): CadenceConflict[] {
  const conflicts: CadenceConflict[] = [];
  const tz = env.DEFAULT_TIMEZONE;
  const candidateDay = dateKeyInTimezone(candidateUtc, tz);

  const sameDay = existingTimes.filter((t) => dateKeyInTimezone(t, tz) === candidateDay);
  if (sameDay.length >= CADENCE.maxPerDay) {
    conflicts.push({ message: `Already ${sameDay.length} post(s) scheduled that day — default cadence is at most ${CADENCE.maxPerDay} per day.` });
  }

  const tooClose = existingTimes.find((t) => Math.abs(t.getTime() - candidateUtc.getTime()) / (1000 * 60 * 60) < CADENCE.minHoursBetween);
  if (tooClose) {
    conflicts.push({ message: `Less than ${CADENCE.minHoursBetween} hours from another scheduled post.` });
  }

  return conflicts;
}
