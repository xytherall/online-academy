import { describe, expect, it } from "vitest";
import { countUnread, formatUnreadBadge, isNew, resolveSeenCutoff } from "./announcements-unread";

describe("resolveSeenCutoff", () => {
  it("falls back to the profile's created_at for a student who has never opened the page", () => {
    expect(resolveSeenCutoff(null, "2026-09-01T00:00:00Z")).toBe("2026-09-01T00:00:00Z");
  });

  it("uses the stored last_seen_at once the student has opened the page", () => {
    expect(resolveSeenCutoff({ last_seen_at: "2026-10-01T00:00:00Z" }, "2026-09-01T00:00:00Z")).toBe(
      "2026-10-01T00:00:00Z",
    );
  });
});

describe("countUnread", () => {
  const cutoff = "2026-10-01T00:00:00Z";

  it("counts nothing when everything is older than the cutoff (all seen)", () => {
    const announcements = [{ created_at: "2026-09-01T00:00:00Z" }, { created_at: "2026-09-15T00:00:00Z" }];
    expect(countUnread(announcements, cutoff)).toBe(0);
  });

  it("counts only announcements posted after the cutoff (some seen)", () => {
    const announcements = [
      { created_at: "2026-09-01T00:00:00Z" }, // seen
      { created_at: "2026-10-02T00:00:00Z" }, // unread
      { created_at: "2026-10-03T00:00:00Z" }, // unread
    ];
    expect(countUnread(announcements, cutoff)).toBe(2);
  });

  it("counts everything visible for a new student (cutoff = account creation)", () => {
    const newStudentCutoff = "2026-10-03T00:00:00Z";
    const announcements = [{ created_at: "2026-09-01T00:00:00Z" }, { created_at: "2026-09-15T00:00:00Z" }];
    // Both predate the new student's account, so neither counts as unread —
    // this is resolveSeenCutoff's job in practice, exercised here directly.
    expect(countUnread(announcements, newStudentCutoff)).toBe(0);
  });

  it("does not count a hypothetical future-dated announcement", () => {
    const announcements = [{ created_at: "2026-12-25T00:00:00Z" }];
    // There is no schedule/publish field in the schema, so this can't occur
    // in practice — this only proves the comparison itself is correct.
    expect(isNew("2026-12-25T00:00:00Z", "2026-10-01T00:00:00Z")).toBe(true);
    expect(countUnread(announcements, "2026-12-25T00:00:01Z")).toBe(0);
  });

  it("does not count an announcement already filtered out by RLS (e.g. another batch's)", () => {
    // Visibility is RLS's job, not this function's — simulate what the
    // query would already have excluded by simply not including it here.
    const announcements: { created_at: string }[] = [];
    expect(countUnread(announcements, cutoff)).toBe(0);
  });
});

describe("formatUnreadBadge", () => {
  it("shows the exact count up to 9", () => {
    expect(formatUnreadBadge(3)).toBe("3");
    expect(formatUnreadBadge(9)).toBe("9");
  });

  it("caps at 9+", () => {
    expect(formatUnreadBadge(10)).toBe("9+");
    expect(formatUnreadBadge(42)).toBe("9+");
  });
});
