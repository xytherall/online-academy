import type { Metadata } from "next";
import Link from "next/link";
import { BellIcon, BellOffIcon, CalendarClockIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { LocalDateTime } from "@/components/local-date-time";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { requireStudent } from "@/lib/auth";
import { getDueReminders, getNotificationsEnabled, getRecentNotifications } from "@/lib/notifications";
import { dueDateBadge } from "@/lib/status-badge";
import { createClient } from "@/lib/supabase/server";
import { MarkAllReadButton, NotificationList } from "./notification-list";

export const metadata: Metadata = { title: "Notifications" };

export default async function StudentNotificationsPage() {
  const profile = await requireStudent();
  const supabase = await createClient();

  const [enabled, { notifications, error }, { reminders, error: remindersError }] = await Promise.all([
    getNotificationsEnabled(supabase, profile.id),
    getRecentNotifications(supabase, profile.id),
    getDueReminders(profile),
  ]);

  const hasUnread = notifications?.some((n) => n.read_at === null) ?? false;

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Notifications</h1>
        {hasUnread ? <MarkAllReadButton /> : null}
      </div>

      {!enabled ? (
        <Alert>
          <BellOffIcon aria-hidden />
          <AlertDescription>
            Notifications are turned off, so you won&apos;t get new ones.{" "}
            <Link href="/student/account" className="font-medium text-primary hover:underline">
              Turn them on in Account
            </Link>
          </AlertDescription>
        </Alert>
      ) : (
        <section>
          <h2 className="mb-3 font-medium">Due soon</h2>
          {remindersError ? (
            <Alert variant="destructive">
              <AlertDescription>Could not load your due work. Please refresh the page.</AlertDescription>
            </Alert>
          ) : reminders && reminders.length > 0 ? (
            <ul className="space-y-2">
              {reminders.map((assessment) => {
                const overdue = dueDateBadge(assessment.due_at).label === "Overdue";
                return (
                  <li key={assessment.id}>
                    <Link
                      href={`/student/assessments/${assessment.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card p-3 hover:bg-accent/50"
                    >
                      <span className="min-w-0">
                        <span className="font-medium">{assessment.title}</span>
                        {assessment.course ? (
                          <span className="text-sm text-muted-foreground"> · {assessment.course.title}</span>
                        ) : null}
                      </span>
                      <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        Due <LocalDateTime iso={assessment.due_at} />
                        <Badge variant={overdue ? "late" : "warning"}>{overdue ? "Overdue" : "Due within a day"}</Badge>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              compact
              icon={CalendarClockIcon}
              title="Nothing due in the next day"
              description="Work due within a day, and anything overdue, will show up here."
            />
          )}
        </section>
      )}

      {enabled ? (
        <p className="text-sm text-muted-foreground">
          Want these as pop-ups on your phone?{" "}
          <Link href="/student/account" className="font-medium text-primary hover:underline">
            Turn on phone notifications
          </Link>
        </p>
      ) : null}

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
            description="New assignments, tests, announcements and marks will show up here."
          />
        )}
      </section>
    </div>
  );
}
