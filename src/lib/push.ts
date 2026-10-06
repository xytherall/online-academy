import "server-only";
import webpush, { WebPushError } from "web-push";
import { notificationHref } from "@/lib/notifications-core";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Phone notifications (Web Push). Sending needs other users'
 * subscriptions, which RLS rightly hides from everyone but their owner, so
 * this module uses the secret-key client. It is only ever called from
 * (a) admin Server Actions, after requireAdmin(), (b) the daily due-work
 * reminder route, after it has checked CRON_SECRET, and (c) the apply form,
 * ask-a-question and submit actions, right after their own insert succeeded,
 * to push the admin alerts that insert created (sendPushForAdminAlerts). In
 * (c) the caller only names the row it just created; who receives what was
 * already decided by the database trigger.
 */

export type PushMessage = { title: string; body: string; url: string; tag: string };

let configured: boolean | null = null;

function configureWebPush(): boolean {
  if (configured !== null) return configured;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    console.warn("Phone notifications are not configured (VAPID env vars missing); skipping push.");
    configured = false;
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

/** Push expired or was revoked by the student/browser: the subscription is dead. */
function isGone(error: unknown): boolean {
  return error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410);
}

/**
 * Sends each message to every phone/browser its student turned on, and
 * deletes subscriptions the push service reports as gone.
 */
export async function sendPushToUsers(messages: { userId: string; message: PushMessage }[]): Promise<void> {
  if (messages.length === 0 || !configureWebPush()) return;

  const admin = createAdminClient();
  const userIds = [...new Set(messages.map((m) => m.userId))];
  const { data: subscriptions, error } = await admin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);

  if (error) {
    console.error("Could not load push subscriptions:", error.message);
    return;
  }
  if (subscriptions.length === 0) return;

  const deadIds: string[] = [];
  await Promise.all(
    messages.flatMap(({ userId, message }) =>
      subscriptions
        .filter((s) => s.user_id === userId)
        .map(async (s) => {
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              JSON.stringify(message),
              { TTL: 60 * 60 * 24 },
            );
          } catch (sendError) {
            if (isGone(sendError)) deadIds.push(s.id);
            else console.error("Push failed:", sendError instanceof Error ? sendError.message : sendError);
          }
        }),
    ),
  );

  if (deadIds.length > 0) {
    const { error: deleteError } = await admin.from("push_subscriptions").delete().in("id", deadIds);
    if (deleteError) console.error("Could not remove expired push subscriptions:", deleteError.message);
  }
}

/** The row whose insert just created admin alerts (see the stage 21 migration). */
export type AdminAlertSubject =
  | { applicationEmail: string }
  | { questionId: string }
  | { submissionId: string };

/**
 * Sends the phone version of the admin alerts a trigger created for one new
 * row. The apply form can't read its own application back (anon has no
 * select), so an application is found by its email: there is at most one
 * pending application per email.
 */
export async function sendPushForAdminAlerts(subject: AdminAlertSubject): Promise<void> {
  if (!configureWebPush()) return;
  const admin = createAdminClient();

  let query = admin.from("notifications").select("id");
  if ("applicationEmail" in subject) {
    const { data: application, error } = await admin
      .from("applications")
      .select("id")
      .ilike("email", subject.applicationEmail.replace(/[\\%_]/g, "\\$&"))
      .eq("status", "pending")
      .maybeSingle();
    if (error || !application) {
      if (error) console.error("Could not find the new application to push:", error.message);
      return;
    }
    query = query.eq("kind", "new_application").eq("application_id", application.id);
  } else if ("questionId" in subject) {
    query = query.eq("kind", "new_question").eq("question_id", subject.questionId);
  } else {
    query = query.eq("kind", "late_submission").eq("submission_id", subject.submissionId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Could not load admin alerts to push:", error.message);
    return;
  }
  await sendPushForNotifications(data.map((n) => n.id));
}

/** Sends the phone version of bell notifications that were just created. */
export async function sendPushForNotifications(notificationIds: string[]): Promise<void> {
  if (notificationIds.length === 0 || !configureWebPush()) return;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("notifications")
    .select("id, user_id, kind, title, body, assessment_id, question_id, application_id")
    .in("id", notificationIds);

  if (error) {
    console.error("Could not load notifications to push:", error.message);
    return;
  }

  await sendPushToUsers(
    data.map((n) => ({
      userId: n.user_id,
      message: {
        title: n.title,
        body: n.body ?? "Tap to open.",
        url: notificationHref(n),
        tag: n.id,
      },
    })),
  );
}
