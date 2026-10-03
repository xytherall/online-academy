"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { markAnnouncementsSeen } from "./actions";

/**
 * Fires once on mount so opening this page marks everything as seen (SPEC
 * §7). router.refresh() re-runs the student layout server-side afterwards —
 * without it the nav's unread count/dot would keep showing the stale value
 * until a full reload, since the App Router caches layout output across
 * client-side navigations.
 */
export function MarkSeenOnMount() {
  const router = useRouter();

  useEffect(() => {
    void markAnnouncementsSeen().then(() => router.refresh());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
