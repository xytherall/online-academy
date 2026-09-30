"use client";

import { THEME_STORAGE_KEY, type Theme } from "@/lib/theme-constants";

function computeInitial(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

let current: Theme = computeInitial();
const listeners = new Set<() => void>();
let mediaListenerAttached = false;

function apply(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  current = theme;
  listeners.forEach((listener) => listener());
}

/** Explicit user choice — persisted, and wins over the OS setting from now on. */
export function setTheme(theme: Theme) {
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  apply(theme);
}

export function getSnapshot(): Theme {
  return current;
}

// The server always renders the light tokens; useSyncExternalStore renders
// this snapshot through hydration and flips to getSnapshot() right after,
// the same technique src/lib/use-is-client.ts uses for local-time formatting.
export function getServerSnapshot(): Theme {
  return "light";
}

export function subscribe(listener: () => void): () => void {
  if (!mediaListenerAttached && typeof window !== "undefined") {
    mediaListenerAttached = true;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", (event) => {
      // An explicit stored choice always wins over a live OS change.
      if (window.localStorage.getItem(THEME_STORAGE_KEY)) return;
      apply(event.matches ? "dark" : "light");
    });
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}
