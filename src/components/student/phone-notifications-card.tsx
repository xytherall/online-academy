"use client";

import { useState } from "react";
import { BellRingIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePhoneNotifications } from "@/lib/use-phone-notifications";

const DISMISSED_STORAGE_KEY = "phone-notifications-card-dismissed";

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISSED_STORAGE_KEY) === "1";
  } catch {
    // Storage blocked (private mode etc.): just show the card.
    return false;
  }
}

/**
 * Dashboard prompt to turn on phone notifications, next to the install card.
 * Shown only while they're off on this device and could be turned on (or,
 * on iPhone Safari, with the add-to-home-screen hint). Hidden once on,
 * dismissed, blocked, unsupported, or while bell notifications are off.
 */
export function PhoneNotificationsCard({ notificationsEnabled }: { notificationsEnabled: boolean }) {
  const { state, isPending, turnOn } = usePhoneNotifications();
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  // Read after hydration: localStorage isn't available on the server.
  if (dismissed === null && state !== "checking") setDismissed(readDismissed());

  if (!notificationsEnabled || dismissed !== false || (state !== "off" && state !== "ios-needs-install")) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISSED_STORAGE_KEY, "1");
    } catch {
      // Storage blocked: hide for this visit only.
    }
    setDismissed(true);
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
        <BellRingIcon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium">Get notifications on your phone</p>
        {state === "ios-needs-install" ? (
          <p className="text-sm text-muted-foreground">
            On iPhone, first add the app to your Home Screen (Share, then Add to Home Screen) and open it from there.
            Needs iOS 16.4 or newer.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              New work, announcements, marks and reminders for work due tomorrow, even when the app is closed.
            </p>
            <Button type="button" className="mt-2 px-4" disabled={isPending} onClick={turnOn}>
              {isPending ? "Turning on…" : "Turn on notifications"}
            </Button>
          </>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="-mt-1 -mr-1 shrink-0"
        aria-label="Hide this"
        onClick={dismiss}
      >
        <XIcon aria-hidden />
      </Button>
    </div>
  );
}
