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
    expect(notificationHref({ kind: "assignment", assessment_id: "a1", question_id: null, application_id: null })).toBe(
      "/student/assessments/a1",
    );
    expect(notificationHref({ kind: "test", assessment_id: "a2", question_id: null, application_id: null })).toBe("/student/assessments/a2");
    expect(notificationHref({ kind: "marks", assessment_id: "a3", question_id: null, application_id: null })).toBe("/student/assessments/a3");
  });

  it("links announcements to the announcements page", () => {
    expect(notificationHref({ kind: "announcement", assessment_id: null, question_id: null, application_id: null })).toBe(
      "/student/announcements",
    );
  });

  it("links answered questions to the question page", () => {
    expect(notificationHref({ kind: "answer", assessment_id: null, question_id: "q1", application_id: null })).toBe("/student/questions/q1");
  });
  it("links admin alerts to the admin area", () => {
    expect(notificationHref({ kind: "new_application", assessment_id: null, question_id: null, application_id: "p1" })).toBe(
      "/admin/applications/p1",
    );
    expect(notificationHref({ kind: "new_question", assessment_id: null, question_id: "q2", application_id: null })).toBe(
      "/admin/questions/q2",
    );
    expect(notificationHref({ kind: "late_submission", assessment_id: "a4", question_id: null, application_id: null })).toBe(
      "/admin/assessments/a4",
    );
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
