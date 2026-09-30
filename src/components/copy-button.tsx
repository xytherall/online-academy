"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Copies text to the clipboard. Used for the login message an admin sends a new
 * student (SPEC §6 step 5: "Admin shares login details with the student").
 *
 * navigator.clipboard is unavailable on an insecure origin and can be blocked
 * by permissions, so a failure is reported instead of pretending to have
 * worked — the caller always shows the text on screen as well, so the admin can
 * select it by hand.
 */
export function CopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  variant = "outline",
}: {
  value: string;
  label?: string;
  copiedLabel?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
      window.setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("failed");
    }
  }

  return (
    <div className="space-y-1">
      <Button type="button" variant={variant} size="sm" onClick={handleCopy}>
        {state === "copied" ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
        {state === "copied" ? copiedLabel : label}
      </Button>
      {state === "failed" ? (
        <p className="text-xs text-destructive" role="status">
          Could not reach the clipboard. Select the text below and copy it manually.
        </p>
      ) : null}
      <span className="sr-only" role="status">
        {state === "copied" ? "Copied to clipboard" : ""}
      </span>
    </div>
  );
}
