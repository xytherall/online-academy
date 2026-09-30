"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const STUDENT_NAV_ITEMS = [
  { href: "/student", label: "Dashboard" },
  { href: "/student/courses", label: "My Courses" },
  { href: "/student/announcements", label: "Announcements" },
  { href: "/student/report", label: "Progress report" },
  { href: "/student/account", label: "Account" },
] as const;

export function StudentNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {STUDENT_NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href || (item.href !== "/student" && pathname.startsWith(`${item.href}/`));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
              isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
