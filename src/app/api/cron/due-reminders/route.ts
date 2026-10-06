import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { buildDueReminderMessages } from "@/lib/due-reminders";
import { DUE_REMINDER_WINDOW_MS } from "@/lib/notifications-core";
import { sendPushToUsers } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Daily due-work reminder push (owner decision, SPEC §15). Called once a day
 * by the Netlify scheduled function in netlify/functions/due-reminders.mjs
 * with `Authorization: Bearer <CRON_SECRET>`. Sends one phone notification
 * per student for work due within the next 24 hours that they haven't
 * handed in. Nothing is stored; students who turned notifications off, or
 * never turned phone notifications on, get nothing.
 */

export async function POST(request: Request) {
  if (!process.env.CRON_SECRET) {
    console.error("CRON_SECRET is not set; refusing to run due-work reminders.");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }
  if (!isCronAuthorized(request)) return NextResponse.json({ error: "Not allowed" }, { status: 401 });

  const admin = createAdminClient();
  const now = new Date();
  const windowEnd = new Date(now.getTime() + DUE_REMINDER_WINDOW_MS);

  const { data: assessments, error: assessmentsError } = await admin
    .from("assessments")
    .select("id, title, course_id, batch_id, course:courses(title)")
    .gt("due_at", now.toISOString())
    .lte("due_at", windowEnd.toISOString());
  if (assessmentsError) return failed("load assessments", assessmentsError.message);
  if (assessments.length === 0) return NextResponse.json({ sent: 0 });

  const courseIds = [...new Set(assessments.map((a) => a.course_id))];
  const assessmentIds = assessments.map((a) => a.id);

  const [enrollmentsResult, submissionsResult] = await Promise.all([
    admin.from("enrollments").select("student_id, course_id").in("course_id", courseIds),
    admin.from("submissions").select("assessment_id, student_id").in("assessment_id", assessmentIds),
  ]);
  if (enrollmentsResult.error) return failed("load enrollments", enrollmentsResult.error.message);
  if (submissionsResult.error) return failed("load submissions", submissionsResult.error.message);

  const studentIds = [...new Set(enrollmentsResult.data.map((e) => e.student_id))];
  const [studentsResult, preferencesResult] = await Promise.all([
    admin.from("profiles").select("id, batch_id").in("id", studentIds).eq("role", "student").eq("is_active", true),
    admin.from("notification_preferences").select("user_id").in("user_id", studentIds).eq("enabled", false),
  ]);
  if (studentsResult.error) return failed("load students", studentsResult.error.message);
  if (preferencesResult.error) return failed("load preferences", preferencesResult.error.message);

  const turnedOff = new Set(preferencesResult.data.map((p) => p.user_id));
  const messages = buildDueReminderMessages({
    assessments,
    students: studentsResult.data.filter((s) => !turnedOff.has(s.id)),
    enrollments: enrollmentsResult.data,
    submitted: new Set(submissionsResult.data.map((s) => `${s.assessment_id}:${s.student_id}`)),
    dayKey: now.toISOString().slice(0, 10),
  });

  await sendPushToUsers(messages);
  return NextResponse.json({ sent: messages.length });
}

function failed(step: string, message: string) {
  console.error(`Due-work reminders: could not ${step}:`, message);
  return NextResponse.json({ error: `Could not ${step}` }, { status: 500 });
}
