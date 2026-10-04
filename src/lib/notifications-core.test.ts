import { describe, expect, it } from "vitest";
import { bellCount, isDueForReminder, notificationHref } from "./notifications-core";

const now = new Date("2026-10-04T12:00:00Z");

describe("isDueForReminder", () => {
  it("includes work due within the next 24 hours", () => {
    expect(isDueForReminder("2026-10-05T11:59:00Z", now)).toBe(true);
    expect(isDueForReminder("2026-10-05T12:00:00Z", now)).toBe(true);
  });

  it("includes overdue work", () => {
    expect(isDueForReminder("2026-09-30T08:00:00Z", now)).toBe(true);
  });

  it("excludes work due later than a day away", () => {
    expect(isDueForReminder("2026-10-05T12:01:00Z", now)).toBe(false);
  });
});

describe("notificationHref", () => {
  it("links assessment notifications to the assessment page", () => {
    expect(notificationHref({ kind: "assignment", assessment_id: "a1" })).toBe("/student/assessments/a1");
    expect(notificationHref({ kind: "test", assessment_id: "a2" })).toBe("/student/assessments/a2");
    expect(notificationHref({ kind: "marks", assessment_id: "a3" })).toBe("/student/assessments/a3");
  });

  it("links announcements to the announcements page", () => {
    expect(notificationHref({ kind: "announcement", assessment_id: null })).toBe("/student/announcements");
  });
});

describe("bellCount", () => {
  it("adds unread notifications and due reminders", () => {
    expect(bellCount(true, 2, 3)).toBe(5);
  });

  it("is zero when notifications are turned off", () => {
    expect(bellCount(false, 2, 3)).toBe(0);
  });
});
