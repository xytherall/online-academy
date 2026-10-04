/**
 * Pure live-class helpers, kept free of Supabase so they can be unit tested
 * without a database (same split as notifications-core.ts).
 *
 * The admin enters class times in Saudi time whatever their device's time
 * zone. Saudi Arabia is UTC+3 all year (no daylight saving), so a fixed
 * offset is exact.
 */

export const SAUDI_TIME_ZONE = "Asia/Riyadh";
const SAUDI_OFFSET_MS = 3 * 60 * 60 * 1000;

/** A class stays on the dashboard until an hour after it starts, so one in progress can still be joined. */
export const LIVE_CLASS_GRACE_MS = 60 * 60 * 1000;

const DATETIME_LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/**
 * "2026-10-05T19:30" (a datetime-local value, read as Saudi time) → UTC ISO
 * string, or null if it isn't a real date and time.
 */
export function saudiLocalToIso(value: string): string | null {
  const match = DATETIME_LOCAL.exec(value);
  if (!match) return null;
  const [year, month, day, hours, minutes] = match.slice(1).map(Number);
  const utcMs = Date.UTC(year, month - 1, day, hours, minutes) - SAUDI_OFFSET_MS;
  const check = new Date(utcMs + SAUDI_OFFSET_MS);
  // Date.UTC silently rolls 31 Feb into March; reject anything that rolled.
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day ||
    check.getUTCHours() !== hours ||
    check.getUTCMinutes() !== minutes
  ) {
    return null;
  }
  return new Date(utcMs).toISOString();
}

/** Inverse of saudiLocalToIso: stored UTC → the datetime-local value in Saudi time. */
export function isoToSaudiLocal(iso: string): string {
  const date = new Date(new Date(iso).getTime() + SAUDI_OFFSET_MS);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`
  );
}

/** Saudi-time label for the admin list. Safe on the server (fixed time zone). */
export function formatSaudiDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: SAUDI_TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Classes starting at or after this instant still count as upcoming. */
export function upcomingCutoffIso(now: Date = new Date()): string {
  return new Date(now.getTime() - LIVE_CLASS_GRACE_MS).toISOString();
}

export function isUpcoming(startsAtIso: string, now: Date = new Date()): boolean {
  return new Date(startsAtIso).getTime() >= now.getTime() - LIVE_CLASS_GRACE_MS;
}
