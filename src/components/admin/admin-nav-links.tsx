"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/applications", label: "Applications" },
  { href: "/admin/students", label: "Students" },
  { href: "/admin/batches", label: "Batches" },
  { href: "/admin/courses", label: "Courses" },
  { href: "/admin/marking", label: "Marking" },
  { href: "/admin/announcements", label: "Announcements" },
  { href: "/admin/settings", label: "Settings" },
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
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
              isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground",
            )}
          >
            <span>{item.label}</span>
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
