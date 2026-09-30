"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const PUBLIC_NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/courses", label: "Courses" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export function PublicNavLinks({
  onNavigate,
  className,
  linkClassName,
}: {
  onNavigate?: () => void;
  className?: string;
  linkClassName?: string;
}) {
  const pathname = usePathname();

  return (
    <nav className={className}>
      {PUBLIC_NAV_ITEMS.map((item) => {
        const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "text-sm font-medium transition-colors hover:text-foreground",
              isActive ? "text-foreground" : "text-muted-foreground",
              linkClassName,
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
