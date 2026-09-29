"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

// Server Components render in UTC, so anything depending on the viewer's
// local time zone can only be computed once we know we're on the client.
// useSyncExternalStore (not an effect + setState, which React's lint rules
// discourage for one-time initialization) renders the server snapshot on the
// first client pass to match SSR, then flips to the client snapshot right
// after hydration.
export function useIsClient(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
