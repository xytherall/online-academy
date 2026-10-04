"use client";

import { useSyncExternalStore } from "react";
import { SmartphoneIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  dismissInstall,
  getServerSnapshot,
  getSnapshot,
  promptInstall,
  subscribe,
} from "@/lib/install-prompt-store";

/**
 * Offers to add the portal to the phone's home screen. Hidden once the app is
 * installed, once dismissed, and in browsers that can't install it.
 */
export function InstallAppCard() {
  const { canPrompt, isIos, isInstalled, dismissed } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (isInstalled || dismissed || (!canPrompt && !isIos)) return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
        <SmartphoneIcon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium">Get the app on your phone</p>
        {canPrompt ? (
          <>
            <p className="text-sm text-muted-foreground">
              Open the portal straight from your home screen, full screen like any other app.
            </p>
            <Button type="button" className="mt-2 px-4" onClick={() => void promptInstall()}>
              Install app
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Tap the <span className="font-medium text-foreground">Share</span> button in your browser, then choose{" "}
            <span className="font-medium text-foreground">Add to Home Screen</span>.
          </p>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="-mt-1 -mr-1 shrink-0"
        aria-label="Hide this"
        onClick={dismissInstall}
      >
        <XIcon aria-hidden />
      </Button>
    </div>
  );
}
