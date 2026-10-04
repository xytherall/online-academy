/**
 * Pure live-class helpers, kept free of Supabase so they can be unit tested
 * without a database (same split as notifications-core.ts).
 */

/** A class stays on the dashboard until an hour after it starts, so one in progress can still be joined. */
export const LIVE_CLASS_GRACE_MS = 60 * 60 * 1000;

/** Classes starting at or after this instant still count as upcoming. */
export function upcomingCutoffIso(now: Date = new Date()): string {
  return new Date(now.getTime() - LIVE_CLASS_GRACE_MS).toISOString();
}

export function isUpcoming(startsAtIso: string, now: Date = new Date()): boolean {
  return new Date(startsAtIso).getTime() >= now.getTime() - LIVE_CLASS_GRACE_MS;
}
