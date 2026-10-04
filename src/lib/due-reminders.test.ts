import { describe, expect, it } from "vitest";
import { buildDueReminderMessages } from "./due-reminders";

const maths = { id: "a1", title: "Algebra sheet", course_id: "c1", batch_id: null, course: { title: "O Level Maths" } };
const physicsBatchB = { id: "a2", title: "Forces quiz", course_id: "c2", batch_id: "b2", course: { title: "A Level Physics" } };

describe("buildDueReminderMessages", () => {
  const enrollments = [
    { student_id: "s1", course_id: "c1" },
    { student_id: "s1", course_id: "c2" },
    { student_id: "s2", course_id: "c1" },
  ];

  it("sends one message per student with the single due item", () => {
    const result = buildDueReminderMessages({
      assessments: [maths],
      students: [{ id: "s2", batch_id: null }],
      enrollments,
      submitted: new Set(),
      dayKey: "2026-10-04",
    });
    expect(result).toEqual([
      {
        userId: "s2",
        message: {
          title: "Due within a day: Algebra sheet",
          body: "O Level Maths. Don't forget to hand it in.",
          url: "/student/assessments/a1",
          tag: "due-2026-10-04",
        },
      },
    ]);
  });

  it("combines several items into one message", () => {
    const [only] = buildDueReminderMessages({
      assessments: [maths, physicsBatchB],
      students: [{ id: "s1", batch_id: "b2" }],
      enrollments,
      submitted: new Set(),
      dayKey: "d",
    });
    expect(only.message.title).toBe("2 things due within a day");
    expect(only.message.url).toBe("/student/notifications");
  });

  it("skips submitted work, other batches and courses the student isn't in", () => {
    const result = buildDueReminderMessages({
      assessments: [maths, physicsBatchB],
      students: [
        { id: "s1", batch_id: "other" },
        { id: "s2", batch_id: null },
      ],
      enrollments,
      submitted: new Set(["a1:s1", "a1:s2"]),
      dayKey: "d",
    });
    expect(result).toEqual([]);
  });
});
