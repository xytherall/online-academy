"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStudent } from "@/lib/auth";
import { notificationHref } from "@/lib/notifications-core";
import { createClient } from "@/lib/supabase/server";

export type NotificationActionResult = { error: string | null };

const notificationIdSchema = z.uuid();
const preferenceSchema = z.boolean();

/**
 * Marks one notification read and opens the page it's about. The target is
 * worked out from the stored row (RLS: the student's own rows only), never
 * from anything the client sends.
 */
export async function openNotification(notificationId: string): Promise<NotificationActionResult> {
  const profile = await requireStudent();

  const parsed = notificationIdSchema.safeParse(notificationId);
  if (!parsed.success) return { error: "Notification not found." };

  const supabase = await createClient();
  const { data: notification, error } = await supabase
    .from("notifications")
    .select("id, kind, assessment_id, read_at")
    .eq("id", parsed.data)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (error) return { error: "Could not open the notification. Please try again." };
  if (!notification) return { error: "Notification not found." };

  if (!notification.read_at) {
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notification.id);
    if (updateError) return { error: "Could not open the notification. Please try again." };
  }

  revalidatePath("/student", "layout");
  redirect(notificationHref(notification));
}

export async function markAllNotificationsRead(): Promise<NotificationActionResult> {
  const profile = await requireStudent();
  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", profile.id)
    .is("read_at", null);

  if (error) return { error: "Could not mark notifications as read. Please try again." };

  revalidatePath("/student", "layout");
  return { error: null };
}

/**
 * Turning notifications off stops new ones being created for this student
 * (the notify_* SQL functions skip them) and hides the bell badge.
 */
export async function setNotificationsEnabled(enabled: boolean): Promise<NotificationActionResult> {
  const profile = await requireStudent();

  const parsed = preferenceSchema.safeParse(enabled);
  if (!parsed.success) return { error: "Please try again." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("notification_preferences")
    .upsert({ user_id: profile.id, enabled: parsed.data }, { onConflict: "user_id" });

  if (error) return { error: "Could not save your setting. Please try again." };

  revalidatePath("/student", "layout");
  return { error: null };
}
