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
    course_ids: [],
    batch_ids: [],
  };

  it("accepts a class for everyone", () => {
    const parsed = liveClassSchema.parse(valid);
    expect(parsed).toEqual({
      title: "Physics revision",
      starts_at: "2026-10-05T14:30:00.000Z",
      join_url: "https://zoom.us/j/123",
      note: null,
      course_ids: [],
      batch_ids: [],
    });
  });

  it("accepts several courses and several batches", () => {
    const courseA = "7a2d3c4b-1e0f-4a9b-8c7d-6e5f4a3b2c1d";
    const courseB = "8b3e4d5c-2f1a-4b0c-9d8e-7f6a5b4c3d2e";
    const batchId = "4f1c2b8e-5a6d-4e3f-9b2a-1c0d7e8f9a0b";
    expect(liveClassSchema.parse({ ...valid, course_ids: [courseA, courseB], batch_ids: [batchId] })).toMatchObject({
      course_ids: [courseA, courseB],
      batch_ids: [batchId],
    });
    expect(liveClassSchema.parse({ ...valid, batch_ids: [batchId] })).toMatchObject({
      course_ids: [],
      batch_ids: [batchId],
    });
  });

  it("drops duplicate targets and rejects ids that are not uuids", () => {
    const courseId = "7a2d3c4b-1e0f-4a9b-8c7d-6e5f4a3b2c1d";
    expect(liveClassSchema.parse({ ...valid, course_ids: [courseId, courseId] }).course_ids).toEqual([courseId]);
    expect(liveClassSchema.safeParse({ ...valid, course_ids: ["not-a-course"] }).success).toBe(false);
    expect(liveClassSchema.safeParse({ ...valid, batch_ids: ["everyone"] }).success).toBe(false);
    expect(liveClassSchema.safeParse({ ...valid, course_ids: undefined }).success).toBe(false);
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
    expect(notificationHref({ kind: "live_class", assessment_id: null, question_id: null, application_id: null })).toBe("/student");
  });
});
