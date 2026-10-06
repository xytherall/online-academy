"use client";

import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { NOTIFICATIONS_CHANGED_EVENT } from "@/lib/notifications-core";
import { setNotificationsEnabled } from "@/lib/notification-actions";

export function NotificationsToggle({ initialEnabled, description }: { initialEnabled: boolean; description: string }) {
  const id = useId();
  const labelId = `${id}-label`;
  const descriptionId = `${id}-description`;
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: boolean) {
    setEnabled(next);
    startTransition(async () => {
      const result = await setNotificationsEnabled(next);
      if (result.error) {
        setEnabled(!next);
        toast.error(result.error);
        return;
      }
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
      toast.success(next ? "Notifications turned on" : "Notifications turned off");
    });
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <Label id={labelId}>Show notifications</Label>
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      <Switch
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        checked={enabled}
        disabled={isPending}
        onCheckedChange={handleChange}
      />
    </div>
  );
}
