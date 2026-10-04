"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenIcon,
  ClipboardListIcon,
  LayoutDashboardIcon,
  MegaphoneIcon,
  MessageCircleQuestionMarkIcon,
  UserIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatUnreadBadge } from "@/lib/announcements-unread";
import { cn } from "@/lib/utils";

export const STUDENT_NAV_ITEMS = [
  { href: "/student", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/student/courses", label: "My Courses", icon: BookOpenIcon },
  { href: "/student/announcements", label: "Announcements", icon: MegaphoneIcon },
  { href: "/student/questions", label: "Ask the teacher", icon: MessageCircleQuestionMarkIcon },
  { href: "/student/report", label: "Progress report", icon: ClipboardListIcon },
  { href: "/student/account", label: "Account", icon: UserIcon },
] as const;

export function StudentNavLinks({
  onNavigate,
  unreadAnnouncements = 0,
}: {
  onNavigate?: () => void;
  unreadAnnouncements?: number;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {STUDENT_NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href || (item.href !== "/student" && pathname.startsWith(`${item.href}/`));
        const Icon = item.icon;
        const showUnread = item.href === "/student/announcements" && unreadAnnouncements > 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-primary-soft hover:text-primary",
              isActive ? "bg-primary-soft text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {item.label}
            {showUnread ? (
              <span className="ml-auto flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
                <Badge variant="info" className="h-5 min-w-5 justify-center px-1 text-[11px]">
                  <span className="sr-only">{unreadAnnouncements} unread</span>
                  <span aria-hidden="true">{formatUnreadBadge(unreadAnnouncements)}</span>
                </Badge>
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
