"use client";

import { useSyncExternalStore } from "react";
import { Toaster } from "sonner";
import { getServerSnapshot, getSnapshot, subscribe } from "@/lib/theme-store";

function subscribeToViewport(callback: () => void) {
  const media = window.matchMedia("(min-width: 640px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function getViewportSnapshot() {
  return window.matchMedia("(min-width: 640px)").matches;
}

/** Server/pre-hydration default: desktop position, flips to mobile immediately on a small screen. */
function getViewportServerSnapshot() {
  return true;
}

/** One toast system for the whole app (SPEC: bottom-centre on mobile, bottom-right on desktop). */
export function AppToaster() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isDesktop = useSyncExternalStore(subscribeToViewport, getViewportSnapshot, getViewportServerSnapshot);

  return <Toaster theme={theme} position={isDesktop ? "bottom-right" : "bottom-center"} richColors closeButton />;
}
