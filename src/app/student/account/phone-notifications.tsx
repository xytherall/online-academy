"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { hasPushSubscription, removePushSubscription, savePushSubscription } from "../notifications/actions";

type PushState = "checking" | "unsupported" | "ios-needs-install" | "denied" | "off" | "on";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function base64UrlToBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** iPhone/iPad Safari only offers push inside the home-screen app (iOS 16.4+). */
function isIosBrowserTab(): boolean {
  const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent);
  return isIos && !window.matchMedia("(display-mode: standalone)").matches;
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  // In production the app registers the service worker on load; in
  // development it doesn't, so register it here when the student asks.
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (!existing) await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  return navigator.serviceWorker.ready;
}

async function detectState(): Promise<PushState> {
  if (!isPushSupported()) return isIosBrowserTab() ? "ios-needs-install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return "off";
  return (await hasPushSubscription(subscription.endpoint)) ? "on" : "off";
}

export function PhoneNotifications({ notificationsEnabled }: { notificationsEnabled: boolean }) {
  const [state, setState] = useState<PushState>("checking");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void detectState()
      .catch(() => "off" as const)
      .then((next) => {
        if (!cancelled) setState(next);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function turnOn() {
    startTransition(async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setState(permission === "denied" ? "denied" : "off");
          return;
        }
        const registration = await getRegistration();
        const subscription =
          (await registration.pushManager.getSubscription()) ??
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: base64UrlToBytes(VAPID_PUBLIC_KEY),
          }));
        const result = await savePushSubscription(subscription.toJSON());
        if (result.error) {
          toast.error(result.error);
          return;
        }
        setState("on");
        toast.success("Phone notifications turned on for this device");
      } catch (error) {
        console.error("Could not turn on phone notifications", error);
        toast.error("Could not turn on phone notifications on this device.");
      }
    });
  }

  function turnOff() {
    startTransition(async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration("/");
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
          const result = await removePushSubscription(subscription.endpoint);
          if (result.error) {
            toast.error(result.error);
            return;
          }
          await subscription.unsubscribe();
        }
        setState("off");
        toast.success("Phone notifications turned off for this device");
      } catch (error) {
        console.error("Could not turn off phone notifications", error);
        toast.error("Could not turn off phone notifications on this device.");
      }
    });
  }

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
