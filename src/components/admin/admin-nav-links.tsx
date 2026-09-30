"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenIcon,
  CheckSquareIcon,
  InboxIcon,
  LayersIcon,
  LayoutDashboardIcon,
  MegaphoneIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboardIcon },
  { href: "/admin/applications", label: "Applications", icon: InboxIcon },
  { href: "/admin/students", label: "Students", icon: UsersIcon },
  { href: "/admin/batches", label: "Batches", icon: LayersIcon },
  { href: "/admin/courses", label: "Courses", icon: BookOpenIcon },
  { href: "/admin/marking", label: "Marking", icon: CheckSquareIcon },
  { href: "/admin/announcements", label: "Announcements", icon: MegaphoneIcon },
  { href: "/admin/settings", label: "Settings", icon: SettingsIcon },
] as const;

/**
 * `pendingApplicationCount` is read once per request in the admin layout and
 * shown as a badge, so a new application is noticeable without visiting the
 * page. Zero renders no badge rather than a "0".
 */
export function AdminNavLinks({
  onNavigate,
  pendingApplicationCount = 0,
}: {
  onNavigate?: () => void;
  pendingApplicationCount?: number;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {ADMIN_NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
        const badgeCount = item.href === "/admin/applications" ? pendingApplicationCount : 0;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-primary-soft hover:text-primary",
              isActive ? "bg-primary-soft text-primary" : "text-muted-foreground",
            )}
          >
            <span className="flex items-center gap-2">
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {item.label}
            </span>
            {badgeCount > 0 ? (
              <span
                className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground"
                aria-label={`${badgeCount} pending`}
              >
                {badgeCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
