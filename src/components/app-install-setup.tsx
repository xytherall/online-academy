"use client";

import { useEffect } from "react";
import { initInstallPrompt } from "@/lib/install-prompt-store";

/**
 * Mounted once in the root layout: starts listening for the browser's install
 * prompt and registers the service worker (public/sw.js) that shows /offline
 * when there's no connection. Renders nothing.
 */
export function AppInstallSetup() {
  useEffect(() => {
    initInstallPrompt();

    // In development the service worker would keep serving a stale /offline
    // between rebuilds, so it only runs in production builds.
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch((error: unknown) => {
      console.error("Service worker registration failed", error);
    });
  }, []);

  return null;
}
