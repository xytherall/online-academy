"use client";

import { Button } from "@/components/ui/button";
import { VAPID_PUBLIC_KEY, usePhoneNotifications } from "@/lib/use-phone-notifications";

export function PhoneNotifications({ notificationsEnabled }: { notificationsEnabled: boolean }) {
  const { state, isPending, turnOn, turnOff } = usePhoneNotifications();

  if (!VAPID_PUBLIC_KEY) return null;

  return (
    <div className="space-y-2 border-t border-border pt-4">
      <p className="text-sm font-medium">Phone notifications</p>
      {state === "checking" ? (
        <p className="text-sm text-muted-foreground">Checking this device…</p>
      ) : state === "ios-needs-install" ? (
        <p className="text-sm text-muted-foreground">
          On iPhone or iPad, first add this app to your Home Screen (Share, then Add to Home Screen) and open it from
          there. Needs iOS 16.4 or newer.
        </p>
      ) : state === "unsupported" ? (
        <p className="text-sm text-muted-foreground">This browser can&apos;t show phone notifications.</p>
      ) : state === "denied" ? (
        <p className="text-sm text-muted-foreground">
          Notifications are blocked for this site. Allow them in your browser or phone settings, then come back here.
        </p>
      ) : state === "on" ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">On for this device.</p>
          <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={turnOff}>
            {isPending ? "Turning off…" : "Turn off on this device"}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {notificationsEnabled
              ? "Get a pop-up on this phone or computer, even when the app is closed."
              : "Turn on Show notifications above first."}
          </p>
          <Button type="button" size="sm" disabled={isPending || !notificationsEnabled} onClick={turnOn}>
            {isPending ? "Turning on…" : "Turn on phone notifications"}
          </Button>
        </div>
      )}
    </div>
  );
}
