import "server-only";
import { timingSafeEqual } from "node:crypto";

/**
 * Scheduled jobs (netlify/functions/*.mjs) call the app's /api/cron/* routes
 * with `Authorization: Bearer <CRON_SECRET>`. False when CRON_SECRET isn't
 * set, so an unconfigured site never runs them.
 */
export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
