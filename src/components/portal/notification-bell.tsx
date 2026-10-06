"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { formatUnreadBadge } from "@/lib/announcements-unread";
import { NOTIFICATIONS_CHANGED_EVENT } from "@/lib/notifications-core";
import { cn } from "@/lib/utils";

async function fetchBellCount(countUrl: string): Promise<number | null> {
  try {
    const response = await fetch(countUrl, { cache: "no-store" });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (data && typeof data === "object" && "count" in data && typeof data.count === "number") return data.count;
    return null;
  } catch (error) {
    // Offline or a network blip: keep showing the last known count.
    console.warn("Could not refresh the notification count", error);
    return null;
  }
}

/**
 * Header bell for the portal. Students: unread notifications plus live
 * due-work reminders. Admins: unread alerts. 0 while notifications are off.
 *
 * The first count comes from the layout, but a layout is not re-rendered
 * on client-side navigation, so on its own it would go stale. The bell
 * therefore re-fetches its count whenever the page changes, when the tab
 * regains focus, and when a notification is marked read.
 */
export function NotificationBell({
  initialCount,
  href,
  countUrl,
}: {
  initialCount: number;
  /** The notifications page. */
  href: string;
  /** Returns `{ count }` for the signed-in user. */
  countUrl: string;
}) {
  const pathname = usePathname();
  const [count, setCount] = useState(initialCount);
  const [prevInitialCount, setPrevInitialCount] = useState(initialCount);

  // A fresh server render (e.g. after revalidation) wins over the old value.
  if (initialCount !== prevInitialCount) {
    setPrevInitialCount(initialCount);
    setCount(initialCount);
  }

  useEffect(() => {
    let cancelled = false;
    const update = () => {
      void fetchBellCount(countUrl).then((next) => {
        if (!cancelled && next !== null) setCount(next);
      });
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") update();
    };

    update();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, update);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, update);
    };
    // Re-run on every page change, since the layout holding the bell is not re-rendered.
  }, [pathname, countUrl]);

  const label = count > 0 ? `Notifications, ${count} new` : "Notifications";

  return (
    <Link
      href={href}
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
