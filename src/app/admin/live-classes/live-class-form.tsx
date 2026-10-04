"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { isoToSaudiLocal } from "@/lib/live-classes-core";
import type { Tables } from "@/lib/supabase/database.types";
import { EVERYONE_VALUE, liveClassSchema } from "@/lib/validation/live-classes";
import { createLiveClass, updateLiveClass, type LiveClassFormState } from "./actions";

const initialState: LiveClassFormState = { error: null, success: false };

type LiveClass = Tables<"live_classes">;
type Batch = Pick<Tables<"batches">, "id" | "name">;

export function LiveClassForm(
  props:
    | { mode: "create"; batches: Batch[]; onDone: () => void }
    | { mode: "edit"; liveClass: LiveClass; batches: Batch[]; onDone: () => void },
) {
  const liveClass = props.mode === "edit" ? props.liveClass : undefined;
  const action = props.mode === "create" ? createLiveClass : updateLiveClass.bind(null, props.liveClass.id);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const router = useRouter();

  const [title, setTitle] = useState(liveClass?.title ?? "");
  // Saudi time is a fixed zone, so this is the same on the server and in the browser.
  const [startsAt, setStartsAt] = useState(liveClass ? isoToSaudiLocal(liveClass.starts_at) : "");
  const [joinUrl, setJoinUrl] = useState(liveClass?.join_url ?? "");
  const [note, setNote] = useState(liveClass?.note ?? "");
  const [batchId, setBatchId] = useState<string>(liveClass?.batch_id ?? EVERYONE_VALUE);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (state.success) {
      toast.success("Saved");
      props.onDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);

    const parsed = liveClassSchema.safeParse({
      title: formData.get("title"),
      starts_at: formData.get("starts_at"),
      join_url: formData.get("join_url"),
      note: formData.get("note"),
      batch_id: formData.get("batch_id"),
    });

    if (!parsed.success) {
      event.preventDefault();
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".");
        if (!(key in map)) map[key] = issue.message;
      }
      setFieldErrors(map);
      return;
    }
    setFieldErrors({});
  }

  const batchItems = {
    [EVERYONE_VALUE]: "All students",
    ...Object.fromEntries(props.batches.map((b) => [b.id, b.name])),
  };

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="live-class-title">Title</Label>
        <Input
          id="live-class-title"
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-invalid={Boolean(fieldErrors.title)}
        />
        {fieldErrors.title ? <FieldError>{fieldErrors.title}</FieldError> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="live-class-starts-at">Date and time (Saudi time)</Label>
        <Input
          id="live-class-starts-at"
          name="starts_at"
          type="datetime-local"
          value={startsAt}
          onChange={(event) => setStartsAt(event.target.value)}
          aria-invalid={Boolean(fieldErrors.starts_at)}
        />
        {fieldErrors.starts_at ? <FieldError>{fieldErrors.starts_at}</FieldError> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="live-class-join-url">Join link</Label>
        <Input
          id="live-class-join-url"
          name="join_url"
          type="url"
          inputMode="url"
          placeholder="https://zoom.us/j/…"
          value={joinUrl}
          onChange={(event) => setJoinUrl(event.target.value)}
          aria-invalid={Boolean(fieldErrors.join_url)}
        />
        {fieldErrors.join_url ? <FieldError>{fieldErrors.join_url}</FieldError> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="live-class-note">Note (optional)</Label>
        <Textarea
          id="live-class-note"
          name="note"
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          aria-invalid={Boolean(fieldErrors.note)}
        />
        {fieldErrors.note ? <FieldError>{fieldErrors.note}</FieldError> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="live-class-batch">For</Label>
        <Select
          name="batch_id"
          items={batchItems}
          value={batchId}
          onValueChange={(value) => setBatchId(value ?? EVERYONE_VALUE)}
        >
          <SelectTrigger id="live-class-batch" className="w-full" aria-invalid={Boolean(fieldErrors.batch_id)}>
            <SelectValue placeholder="Choose who this class is for" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={EVERYONE_VALUE}>All students</SelectItem>
            {props.batches.map((batch) => (
              <SelectItem key={batch.id} value={batch.id}>
                {batch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldErrors.batch_id ? <FieldError>{fieldErrors.batch_id}</FieldError> : null}
      </div>

      {props.mode === "edit" ? (
        <p className="text-sm text-muted-foreground">Students are not notified again when you save changes.</p>
      ) : null}

      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            props.onDone();
            router.refresh();
          }}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : props.mode === "create" ? "Add class" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-destructive">{children}</p>;
}
