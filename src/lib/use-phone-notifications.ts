"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  hasPushSubscription,
  removePushSubscription,
  savePushSubscription,
} from "@/app/student/notifications/actions";

/**
 * Phone notifications (Web Push) for this device: detects whether they're
 * on, and turns them on/off. Shared by the Account page control and the
 * dashboard card so both behave identically.
 */

export type PhoneNotificationState = "checking" | "unsupported" | "ios-needs-install" | "denied" | "off" | "on";

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

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

async function detectState(): Promise<PhoneNotificationState> {
  if (!VAPID_PUBLIC_KEY) return "unsupported";
  if (!isPushSupported()) return isIosBrowserTab() ? "ios-needs-install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return "off";
  return (await hasPushSubscription(subscription.endpoint)) ? "on" : "off";
}

export function usePhoneNotifications() {
  const [state, setState] = useState<PhoneNotificationState>("checking");
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
          if (permission === "denied") {
            toast.error("Notifications are blocked. You can allow them in your browser or phone settings.");
          }
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

  return { state, isPending, turnOn, turnOff };
}
