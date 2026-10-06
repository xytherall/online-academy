import type { Metadata } from "next";
import { BellIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { MarkAllReadButton, NotificationList } from "@/components/portal/notification-list";
import { NotificationsToggle } from "@/components/portal/notifications-toggle";
import { PhoneNotifications } from "@/components/portal/phone-notifications";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { getNotificationsEnabled, getRecentNotifications } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Notifications" };

export default async function AdminNotificationsPage() {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const [enabled, { notifications, error }] = await Promise.all([
    getNotificationsEnabled(supabase, profile.id),
    getRecentNotifications(supabase, profile.id),
  ]);

  const hasUnread = notifications?.some((n) => n.read_at === null) ?? false;

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Notifications</h1>
        {hasUnread ? <MarkAllReadButton /> : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <NotificationsToggle
            initialEnabled={enabled}
            description="New applications, new student questions, and work handed in after the due date. When off, you won't get new notifications and the bell shows no count."
          />
          <PhoneNotifications notificationsEnabled={enabled} />
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-3 font-medium">Recent</h2>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>Could not load your notifications. Please refresh the page.</AlertDescription>
          </Alert>
        ) : notifications && notifications.length > 0 ? (
          <NotificationList notifications={notifications} />
        ) : (
          <EmptyState
            compact
            icon={BellIcon}
            title="No notifications yet"
            description="New applications, questions and late submissions will show up here."
          />
        )}
      </section>
    </div>
  );
}
