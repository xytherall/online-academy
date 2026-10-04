/**
 * Pure logic for the daily due-work reminder push, kept free of Supabase so
 * it can be unit tested. The route that runs it
 * (src/app/api/cron/due-reminders/route.ts) only loads the rows.
 */

import type { PushMessage } from "@/lib/push";

export type DueAssessmentRow = {
  id: string;
  title: string;
  course_id: string;
  batch_id: string | null;
  course: { title: string } | null;
};

export type ReminderStudent = { id: string; batch_id: string | null };

/**
 * One message per student who has visible, unsubmitted work in the window.
 * Visibility mirrors the dashboard's upcoming-work rule: enrolled in the
 * course, and in the assessment's batch if it has one.
 */
export function buildDueReminderMessages(input: {
  assessments: DueAssessmentRow[];
  students: ReminderStudent[];
  enrollments: { student_id: string; course_id: string }[];
  submitted: Set<string>;
  dayKey: string;
}): { userId: string; message: PushMessage }[] {
  const { assessments, students, enrollments, submitted, dayKey } = input;
  const enrolled = new Set(enrollments.map((e) => `${e.student_id}:${e.course_id}`));

  return students.flatMap((student) => {
    const due = assessments.filter(
      (a) =>
        enrolled.has(`${student.id}:${a.course_id}`) &&
        (a.batch_id === null || a.batch_id === student.batch_id) &&
        !submitted.has(`${a.id}:${student.id}`),
    );
    if (due.length === 0) return [];

    const message: PushMessage =
      due.length === 1
        ? {
            title: `Due within a day: ${due[0].title}`,
            body: due[0].course ? `${due[0].course.title}. Don't forget to hand it in.` : "Don't forget to hand it in.",
            url: `/student/assessments/${due[0].id}`,
            tag: `due-${dayKey}`,
          }
        : {
            title: `${due.length} things due within a day`,
            body: due.map((a) => a.title).join(", "),
            url: "/student/notifications",
            tag: `due-${dayKey}`,
          };

    return [{ userId: student.id, message }];
  });
}
