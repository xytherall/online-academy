import "server-only";
import { after } from "next/server";
import { bellCount, isDueForReminder } from "@/lib/notifications-core";
import { sendPushForNotifications } from "@/lib/push";
import { getDueSoonAssessments, type DueSoonAssessment } from "@/lib/student";
import type { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type StudentRef = Pick<Tables<"profiles">, "id" | "batch_id">;

export type StudentNotification = Pick<
  Tables<"notifications">,
  "id" | "kind" | "title" | "body" | "assessment_id" | "question_id" | "read_at" | "created_at"
>;

/** No preferences row yet means notifications are on (the default). */
export async function getNotificationsEnabled(supabase: SupabaseServerClient, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("notification_preferences")
    .select("enabled")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.enabled ?? true;
}

/**
 * Live due-work reminders: the dashboard's "Upcoming work" items (same
 * query, so the two never disagree) narrowed to those due within a day or
 * overdue. Never stored — recomputed on every load.
 */
export async function getDueReminders(
  student: StudentRef,
): Promise<{ reminders: DueSoonAssessment[] | null; error: boolean }> {
  const { assessments, error } = await getDueSoonAssessments(student.id, student.batch_id);
  if (error || !assessments) return { reminders: null, error: true };
  const now = new Date();
  return { reminders: assessments.filter((a) => isDueForReminder(a.due_at, now)), error: false };
}

/** Number on the header bell. Errors count as 0 so the header always renders. */
export async function getBellCount(supabase: SupabaseServerClient, student: StudentRef): Promise<number> {
  const enabled = await getNotificationsEnabled(supabase, student.id);
  if (!enabled) return 0;

  const [{ count }, { reminders }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", student.id)
      .is("read_at", null),
    getDueReminders(student),
  ]);

  return bellCount(enabled, count ?? 0, reminders?.length ?? 0);
}

const FEED_LIMIT = 50;

/** Most recent notifications for the notifications page (RLS: own rows only). */
export async function getRecentNotifications(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<{ notifications: StudentNotification[] | null; error: boolean }> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, kind, title, body, assessment_id, question_id, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(FEED_LIMIT);

  if (error) return { notifications: null, error: true };
  return { notifications: data, error: false };
}

/**
 * Called by the admin Server Actions after the main write has succeeded.
 * A failed notification must never undo or fail the admin's actual change,
 * so the error is logged rather than returned. Phone pushes for the new rows
 * are sent after the response, so the admin isn't kept waiting on them.
 */
async function createAndPush(
  label: string,
  promise: PromiseLike<{ data: string[] | null; error: { message: string } | null }>,
) {
  const { data, error } = await promise;
  if (error) {
    console.error(`Could not create ${label} notifications:`, error.message);
    return;
  }
  const ids = data ?? [];
  if (ids.length > 0) after(() => sendPushForNotifications(ids));
}

export function notifyNewAssessment(supabase: SupabaseServerClient, assessmentId: string) {
  return createAndPush("assessment", supabase.rpc("notify_new_assessment", { p_assessment_id: assessmentId }));
}

export function notifyNewAnnouncement(supabase: SupabaseServerClient, announcementId: string) {
  return createAndPush("announcement", supabase.rpc("notify_new_announcement", { p_announcement_id: announcementId }));
}

export function notifyMarks(supabase: SupabaseServerClient, assessmentId: string, studentId: string) {
  return createAndPush(
    "marks",
    supabase.rpc("notify_marks", { p_assessment_id: assessmentId, p_student_id: studentId }),
  );
}

export function notifyAnswer(supabase: SupabaseServerClient, questionId: string) {
  return createAndPush("answer", supabase.rpc("notify_answer", { p_question_id: questionId }));
}
