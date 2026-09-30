import { beforeAll, describe, expect, it } from "vitest";
import {
  MAX_TOKEN_AGE_SECONDS,
  MIN_SECONDS_TO_SUBMIT,
  issueApplyToken,
  verifyApplyToken,
} from "./apply-token";

const RENDERED_AT = 1_759_000_000_000;
const seconds = (n: number) => n * 1000;

beforeAll(() => {
  process.env.APPLY_FORM_SECRET = "test-secret-for-unit-tests";
});

describe("issueApplyToken", () => {
  it("produces a payload.signature pair carrying the render time", () => {
    const token = issueApplyToken(RENDERED_AT);
    const [payload, signature] = token.split(".");
    expect(payload).toBe(String(RENDERED_AT));
    expect(signature).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("is deterministic for the same timestamp and secret", () => {
    expect(issueApplyToken(RENDERED_AT)).toBe(issueApplyToken(RENDERED_AT));
  });
});

describe("verifyApplyToken", () => {
  it("accepts a token submitted after a human amount of time", () => {
    const token = issueApplyToken(RENDERED_AT);
    const submittedAt = RENDERED_AT + seconds(MIN_SECONDS_TO_SUBMIT + 10);
    expect(verifyApplyToken(token, submittedAt)).toEqual({ status: "ok" });
  });

  it("rejects a submission that was too fast", () => {
    const token = issueApplyToken(RENDERED_AT);
    const submittedAt = RENDERED_AT + seconds(MIN_SECONDS_TO_SUBMIT - 1);
    expect(verifyApplyToken(token, submittedAt)).toEqual({ status: "too-fast" });
  });

  it("rejects an instant submission", () => {
    const token = issueApplyToken(RENDERED_AT);
    expect(verifyApplyToken(token, RENDERED_AT)).toEqual({ status: "too-fast" });
  });

  it("reports an old token as expired rather than invalid", () => {
    const token = issueApplyToken(RENDERED_AT);
    const submittedAt = RENDERED_AT + seconds(MAX_TOKEN_AGE_SECONDS + 1);
    expect(verifyApplyToken(token, submittedAt)).toEqual({ status: "expired" });
  });

  it("still accepts a token just inside the age limit", () => {
    const token = issueApplyToken(RENDERED_AT);
    const submittedAt = RENDERED_AT + seconds(MAX_TOKEN_AGE_SECONDS - 1);
    expect(verifyApplyToken(token, submittedAt)).toEqual({ status: "ok" });
  });

  it("rejects a tampered timestamp", () => {
    const token = issueApplyToken(RENDERED_AT);
    const signature = token.split(".")[1];
    // A bot back-dating the render time to look slow enough.
    const forged = `${RENDERED_AT - seconds(60)}.${signature}`;
    expect(verifyApplyToken(forged, RENDERED_AT)).toEqual({ status: "invalid" });
  });

  it("rejects a tampered signature", () => {
    const token = issueApplyToken(RENDERED_AT);
    const forged = `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`;
    const submittedAt = RENDERED_AT + seconds(MIN_SECONDS_TO_SUBMIT + 10);
    expect(verifyApplyToken(forged, submittedAt)).toEqual({ status: "invalid" });
  });

  it("rejects a token signed with a different secret", () => {
    const token = issueApplyToken(RENDERED_AT);
    const original = process.env.APPLY_FORM_SECRET;
    process.env.APPLY_FORM_SECRET = "a-different-secret";
    try {
      const submittedAt = RENDERED_AT + seconds(MIN_SECONDS_TO_SUBMIT + 10);
      expect(verifyApplyToken(token, submittedAt)).toEqual({ status: "invalid" });
    } finally {
      process.env.APPLY_FORM_SECRET = original;
    }
  });

  it.each([
    ["missing", undefined],
    ["not a string", 12345],
    ["empty", ""],
    ["unsigned", String(RENDERED_AT)],
    ["signature only", ".abc"],
    ["non-numeric payload", "not-a-time.abc"],
  ])("rejects a %s token", (_label, value) => {
    expect(verifyApplyToken(value, RENDERED_AT + seconds(60))).toEqual({ status: "invalid" });
  });

  it("rejects an absurdly long token without hashing it", () => {
    expect(verifyApplyToken(`${RENDERED_AT}.${"x".repeat(500)}`, RENDERED_AT)).toEqual({
      status: "invalid",
    });
  });
});

describe("APPLY_FORM_SECRET", () => {
  it("throws rather than silently skipping the check when unset", () => {
    const original = process.env.APPLY_FORM_SECRET;
    delete process.env.APPLY_FORM_SECRET;
    try {
      expect(() => issueApplyToken(RENDERED_AT)).toThrow(/APPLY_FORM_SECRET/);
    } finally {
      process.env.APPLY_FORM_SECRET = original;
    }
  });
});
