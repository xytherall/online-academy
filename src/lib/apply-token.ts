import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Spam protection for the public application form (SPEC §6: "a hidden honeypot
 * field plus server-side validation", no captcha in v1).
 *
 * The form is rendered with a signed timestamp. On submit the server checks the
 * signature and how long the visitor spent on the form: a real person cannot
 * fill in name, email, phone, country, level and courses in under a few
 * seconds, and a bot that posts instantly has no valid token to replay unless
 * it fetched the page first.
 *
 * The signature is what makes the timestamp worth checking at all — without it
 * a bot would simply post `Date.now() - 60000`.
 */

/** A real person cannot complete the form faster than this. */
export const MIN_SECONDS_TO_SUBMIT = 4;

/**
 * How long a rendered form stays submittable. Generous on purpose: someone who
 * opens the form, goes to find their guardian's phone number and comes back an
 * hour later must not lose what they typed. Past this the applicant is asked to
 * reload — never silently dropped, because unlike a bot they would have no idea
 * their application vanished.
 */
export const MAX_TOKEN_AGE_SECONDS = 12 * 60 * 60;

export type ApplyTokenVerdict =
  /** Signature good, and the visitor took a human amount of time. */
  | { status: "ok" }
  /** No token, malformed, or the signature does not match — treat as a bot. */
  | { status: "invalid" }
  /** Signature good but submitted implausibly fast — treat as a bot. */
  | { status: "too-fast" }
  /** Signature good but the form was rendered too long ago — ask for a reload. */
  | { status: "expired" };

function secret(): Buffer {
  const value = process.env.APPLY_FORM_SECRET;
  if (!value) {
    // Loud on purpose. Falling back to an unsigned or unchecked token would
    // silently turn the spam protection off in production.
    throw new Error(
      "APPLY_FORM_SECRET is not set. The application form needs it to sign its anti-spam token.",
    );
  }
  return Buffer.from(value, "utf8");
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** Called when rendering /apply; the result goes into a hidden field. */
export function issueApplyToken(now: number = Date.now()): string {
  const payload = String(now);
  return `${payload}.${sign(payload)}`;
}

export function verifyApplyToken(token: unknown, now: number = Date.now()): ApplyTokenVerdict {
  if (typeof token !== "string" || token.length === 0 || token.length > 200) {
    return { status: "invalid" };
  }

  const separator = token.lastIndexOf(".");
  if (separator <= 0) return { status: "invalid" };

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  if (!/^\d{1,15}$/.test(payload)) return { status: "invalid" };

  const expected = Buffer.from(sign(payload), "utf8");
  const received = Buffer.from(signature, "utf8");
  // timingSafeEqual throws on a length mismatch, so check that first.
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return { status: "invalid" };
  }

  const issuedAt = Number(payload);
  const ageSeconds = (now - issuedAt) / 1000;

  // A token dated in the future is only reachable by tampering (which the
  // signature already rules out) or by a server clock change; either way it
  // cannot be shown to have taken a human amount of time.
  if (ageSeconds < MIN_SECONDS_TO_SUBMIT) return { status: "too-fast" };
  if (ageSeconds > MAX_TOKEN_AGE_SECONDS) return { status: "expired" };

  return { status: "ok" };
}
