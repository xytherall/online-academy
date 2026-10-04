import "server-only";
import webpush, { WebPushError } from "web-push";
import { notificationHref } from "@/lib/notifications-core";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Phone notifications (Web Push). Sending needs other students'
 * subscriptions, which RLS rightly hides from everyone but their owner, so
 * this module uses the secret-key client. It is only ever called from
 * (a) admin Server Actions, after requireAdmin(), and (b) the daily
 * due-work reminder route, after it has checked CRON_SECRET.
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
export async function sendPushToStudents(messages: { userId: string; message: PushMessage }[]): Promise<void> {
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

/** Sends the phone version of bell notifications that were just created. */
export async function sendPushForNotifications(notificationIds: string[]): Promise<void> {
  if (notificationIds.length === 0 || !configureWebPush()) return;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("notifications")
    .select("id, user_id, kind, title, body, assessment_id, question_id")
    .in("id", notificationIds);

  if (error) {
    console.error("Could not load notifications to push:", error.message);
    return;
  }

  await sendPushToStudents(
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
