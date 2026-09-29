"use client";

import { formatLocalDateTime } from "@/lib/format-date";
import { useIsClient } from "@/lib/use-is-client";

// Server Components render in UTC, so this can only be formatted client-side.
export function LocalDateTime({ iso, className }: { iso: string; className?: string }) {
  const isClient = useIsClient();
  return <span className={className}>{isClient ? formatLocalDateTime(iso) : "…"}</span>;
}
