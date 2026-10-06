/**
 * Pure notification helpers, kept free of Supabase so they can be unit
 * tested without a database (same split as announcements-unread.ts).
 */

import type { Tables } from "@/lib/supabase/database.types";

/** Window event fired after the student marks notifications read or changes the setting, so the header bell re-fetches its count. */
export const NOTIFICATIONS_CHANGED_EVENT = "notifications:changed";

/** Due-work reminders cover the next day only (owner decision, SPEC §15). */
export const DUE_REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * True when the item is due within the next day or already overdue. Callers
 * pass items that are already "still to do" (unsubmitted assignments,
 * upcoming tests), so overdue here only ever means an unsubmitted assignment.
 */
export function isDueForReminder(dueAtIso: string, now: Date = new Date()): boolean {
  return new Date(dueAtIso).getTime() - now.getTime() <= DUE_REMINDER_WINDOW_MS;
}

/**
 * Where tapping a notification goes. Built only from the row's own ids, never
 * from a stored URL, so it can only ever point inside the portal. The admin
 * alert kinds go to the admin area; every other kind is a student's.
 */
export function notificationHref(
  notification: Pick<Tables<"notifications">, "kind" | "assessment_id" | "question_id" | "application_id">,
): string {
  if (notification.kind === "new_application") {
    return notification.application_id ? `/admin/applications/${notification.application_id}` : "/admin/applications";
  }
  if (notification.kind === "new_question") {
    return notification.question_id ? `/admin/questions/${notification.question_id}` : "/admin/questions";
  }
  if (notification.kind === "late_submission") {
    return notification.assessment_id ? `/admin/assessments/${notification.assessment_id}` : "/admin/marking";
  }
  if (notification.kind === "answer") {
    return notification.question_id ? `/student/questions/${notification.question_id}` : "/student/questions";
  }
  if (notification.kind === "live_class") return "/student";
  if (notification.kind === "announcement" || !notification.assessment_id) return "/student/announcements";
  return `/student/assessments/${notification.assessment_id}`;
}

/** Bell badge: unread rows plus live due-work reminders; nothing while notifications are off. */
export function bellCount(enabled: boolean, unread: number, dueReminders: number): number {
  return enabled ? unread + dueReminders : 0;
}
