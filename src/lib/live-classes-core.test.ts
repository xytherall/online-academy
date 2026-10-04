import { describe, expect, it } from "vitest";
import { notificationHref } from "./notifications-core";
import { isUpcoming, upcomingCutoffIso } from "./live-classes-core";
import { liveClassSchema } from "./validation/live-classes";

describe("upcoming classes", () => {
  const now = new Date("2026-10-05T12:00:00Z");

  it("keeps a class until an hour after it starts", () => {
    expect(isUpcoming("2026-10-05T13:00:00Z", now)).toBe(true);
    expect(isUpcoming("2026-10-05T11:00:00Z", now)).toBe(true);
    expect(isUpcoming("2026-10-05T10:59:00Z", now)).toBe(false);
    expect(upcomingCutoffIso(now)).toBe("2026-10-05T11:00:00.000Z");
  });
});

describe("liveClassSchema", () => {
  const valid = {
    title: "Physics revision",
    starts_at: "2026-10-05T14:30:00.000Z",
    join_url: "https://zoom.us/j/123",
    note: "",
    batch_id: "everyone",
  };

  it("accepts a class for everyone", () => {
    const parsed = liveClassSchema.parse(valid);
    expect(parsed).toEqual({
      title: "Physics revision",
      starts_at: "2026-10-05T14:30:00.000Z",
      join_url: "https://zoom.us/j/123",
      note: null,
      batch_id: null,
    });
  });

  it("accepts one batch", () => {
    const batchId = "4f1c2b8e-5a6d-4e3f-9b2a-1c0d7e8f9a0b";
    expect(liveClassSchema.parse({ ...valid, batch_id: batchId }).batch_id).toBe(batchId);
  });

  it("only accepts http(s) join links", () => {
    expect(liveClassSchema.safeParse({ ...valid, join_url: "javascript:alert(1)" }).success).toBe(false);
    expect(liveClassSchema.safeParse({ ...valid, join_url: "zoom.us/j/123" }).success).toBe(false);
    expect(liveClassSchema.safeParse({ ...valid, join_url: "https://meet.google.com/a b" }).success).toBe(false);
    expect(liveClassSchema.safeParse({ ...valid, join_url: "http://meet.google.com/abc" }).success).toBe(true);
  });

  it("requires a title and a real time", () => {
    expect(liveClassSchema.safeParse({ ...valid, title: "  " }).success).toBe(false);
    expect(liveClassSchema.safeParse({ ...valid, starts_at: "" }).success).toBe(false);
    expect(liveClassSchema.safeParse({ ...valid, starts_at: "2026-10-05T19:30" }).success).toBe(false);
  });
});

describe("notificationHref", () => {
  it("opens the dashboard for a new live class", () => {
    expect(notificationHref({ kind: "live_class", assessment_id: null, question_id: null })).toBe("/student");
  });
});
