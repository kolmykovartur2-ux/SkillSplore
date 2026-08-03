import { env } from '../config/env.js';

// Times are always stored in UTC (ContentSchedule.scheduledForUtc) and
// displayed in the configured local timezone (DEFAULT_TIMEZONE, "Pacific/Auckland"
// at launch). We deliberately avoid adding a timezone library dependency —
// Intl.DateTimeFormat (built into Node 20) is sufficient for display and for
// computing the UTC offset needed to convert a "local wall-clock time" the
// founder typed into the calendar back into a UTC Date.

export function formatInTimezone(date: Date, timeZone: string = env.DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-NZ', {
    timeZone,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

// Returns the UTC offset, in minutes, of `timeZone` at instant `at`.
// E.g. Pacific/Auckland in NZ summer (DST) is +13:00 -> 780.
function offsetMinutesAt(timeZone: string, at: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = Object.fromEntries(dtf.formatToParts(at).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return Math.round((asUtc - at.getTime()) / 60000);
}

// Converts a "local wall-clock time" (as typed into the calendar UI, with no
// timezone info of its own) in `timeZone` into the correct UTC Date.
export function localWallTimeToUtc(
  parts: { year: number; month: number; day: number; hour: number; minute: number },
  timeZone: string = env.DEFAULT_TIMEZONE,
): Date {
  // Two-pass: assume UTC first to find an approximate offset, then correct.
  const approxUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  const offset = offsetMinutesAt(timeZone, new Date(approxUtc));
  return new Date(approxUtc - offset * 60000);
}

export function hoursBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60);
}
