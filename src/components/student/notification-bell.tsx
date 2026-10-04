import Link from "next/link";
import { BellIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { formatUnreadBadge } from "@/lib/announcements-unread";
import { cn } from "@/lib/utils";

/**
 * Header bell for the student portal. The count is worked out once in
 * StudentLayout (server) — unread notifications plus live due-work
 * reminders, or 0 while the student has notifications turned off.
 */
export function NotificationBell({ count }: { count: number }) {
  const label = count > 0 ? `Notifications, ${count} new` : "Notifications";

  return (
    <Link
      href="/student/notifications"
      aria-label={label}
      className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative rounded-full")}
    >
      <BellIcon aria-hidden />
      {count > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none font-semibold text-background"
        >
          {formatUnreadBadge(count)}
        </span>
      ) : null}
    </Link>
  );
}
