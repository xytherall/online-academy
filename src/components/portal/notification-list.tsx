"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  BellIcon,
  ClipboardCheckIcon,
  ClockAlertIcon,
  FileTextIcon,
  InboxIcon,
  MegaphoneIcon,
  MessageCircleQuestionMarkIcon,
  PenLineIcon,
  VideoIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LocalDateTime } from "@/components/local-date-time";
import { Button } from "@/components/ui/button";
import { markAllNotificationsRead, openNotification } from "@/lib/notification-actions";
import type { PortalNotification } from "@/lib/notifications";
import { NOTIFICATIONS_CHANGED_EVENT } from "@/lib/notifications-core";
import { cn } from "@/lib/utils";

const KIND_ICONS: Record<PortalNotification["kind"], LucideIcon> = {
  assignment: FileTextIcon,
  test: PenLineIcon,
  announcement: MegaphoneIcon,
  marks: ClipboardCheckIcon,
  answer: MessageCircleQuestionMarkIcon,
  live_class: VideoIcon,
  new_application: InboxIcon,
  new_question: MessageCircleQuestionMarkIcon,
  late_submission: ClockAlertIcon,
};

function NotificationRow({ notification }: { notification: PortalNotification }) {
  const [isPending, startTransition] = useTransition();
  const isUnread = notification.read_at === null;
  const Icon = KIND_ICONS[notification.kind] ?? BellIcon;

  return (
    <li>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            // On success the action redirects, so it only returns on failure.
            const result = await openNotification(notification.id);
            if (result?.error) toast.error(result.error);
          })
        }
        className={cn(
          "flex w-full items-start gap-3 rounded-lg border border-border bg-card p-3 text-left hover:bg-accent/50 disabled:opacity-60",
          isUnread && "border-primary/40",
        )}
      >
        <span
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
            isUnread ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block text-sm", isUnread ? "font-semibold" : "text-muted-foreground")}>
            {notification.title}
          </span>
          {notification.body ? (
            <span className="block text-xs text-muted-foreground">{notification.body}</span>
          ) : null}
          <span className="mt-0.5 block text-xs text-muted-foreground">
            <LocalDateTime iso={notification.created_at} />
          </span>
        </span>
        {isUnread ? (
          <span className="mt-2 size-2 shrink-0 rounded-full bg-primary">
            <span className="sr-only">Unread</span>
          </span>
        ) : null}
      </button>
    </li>
  );
}

export function NotificationList({ notifications }: { notifications: PortalNotification[] }) {
  return (
    <ul className="space-y-2">
      {notifications.map((notification) => (
        <NotificationRow key={notification.id} notification={notification} />
      ))}
    </ul>
  );
}

export function MarkAllReadButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await markAllNotificationsRead();
          if (result.error) {
            toast.error(result.error);
            return;
          }
          window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
        })
      }
    >
      {isPending ? "Marking…" : "Mark all read"}
    </Button>
  );
}
