"use client";

// Tracks whether the site can be installed as a home-screen app, for the
// "Install app" card on the student dashboard. Android/Chrome fire
// `beforeinstallprompt` once per page load, often before the dashboard has
// rendered (e.g. on /login), so the listener is attached from the root
// layout (src/components/app-install-setup.tsx) and the event kept here.

const DISMISSED_STORAGE_KEY = "install-app-dismissed";

/** Chromium-only event; not in TypeScript's DOM types. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallState = {
  /** The browser will show its own install dialog (Android Chrome, desktop Chrome/Edge). */
  canPrompt: boolean;
  /** iPhone/iPad: no install dialog exists, so we show Share → Add to Home Screen instructions. */
  isIos: boolean;
  /** Already running as an installed app. */
  isInstalled: boolean;
  dismissed: boolean;
};

const SERVER_STATE: InstallState = { canPrompt: false, isIos: false, isInstalled: false, dismissed: true };

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let state: InstallState = SERVER_STATE;
let initialized = false;
const listeners = new Set<() => void>();

function update(patch: Partial<InstallState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISSED_STORAGE_KEY) === "1";
  } catch {
    // Storage can be blocked (private browsing); the card then shows again next visit.
    return false;
  }
}

function detectIos(): boolean {
  const { userAgent, maxTouchPoints } = window.navigator;
  // iPadOS reports itself as a Mac, so also check for a touch screen.
  return /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
}

function detectInstalled(): boolean {
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia("(display-mode: standalone)").matches;
}

/** Called once from the root layout. */
export function initInstallPrompt() {
  if (initialized) return;
  initialized = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    // Stop Chrome's own mini-infobar; the dashboard card offers the install instead.
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    update({ canPrompt: true });
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    update({ canPrompt: false, isInstalled: true });
  });

  update({ isIos: detectIos(), isInstalled: detectInstalled(), dismissed: readDismissed() });
}

/** Opens the browser's install dialog. Each prompt event can only be used once. */
export async function promptInstall(): Promise<void> {
  if (!deferredPrompt) return;
  const event = deferredPrompt;
  deferredPrompt = null;
  update({ canPrompt: false });
  await event.prompt();
  const { outcome } = await event.userChoice;
  if (outcome === "accepted") update({ isInstalled: true });
}

export function dismissInstall() {
  try {
    window.localStorage.setItem(DISMISSED_STORAGE_KEY, "1");
  } catch {
    // See readDismissed(): hiding it for this visit is still fine.
  }
  update({ dismissed: true });
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): InstallState {
  return state;
}

// The server can't know the device, so it renders the card hidden.
export function getServerSnapshot(): InstallState {
  return SERVER_STATE;
}
