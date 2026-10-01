"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Tables } from "@/lib/supabase/database.types";
import { batchSchema } from "@/lib/validation/batches";
import { createBatch, updateBatch, type BatchFormState } from "./actions";

const initialState: BatchFormState = { error: null };

type Batch = Tables<"batches">;

export function BatchForm(
  props: { mode: "create" } | { mode: "edit"; batch: Batch },
) {
  const batch = props.mode === "edit" ? props.batch : undefined;
  const action = props.mode === "create" ? createBatch : updateBatch.bind(null, props.batch.id);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (state.success) toast.success("Saved");
  }, [state]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const parsed = batchSchema.safeParse({
      name: formData.get("name"),
      notes: formData.get("notes"),
    });

    if (parsed.success) {
      setFieldErrors({});
      return;
    }

    event.preventDefault();
    const map: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!(key in map)) map[key] = issue.message;
    }
    setFieldErrors(map);
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="max-w-xl space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={batch?.name ?? ""}
          aria-invalid={Boolean(fieldErrors.name)}
        />
        {fieldErrors.name ? <FieldError>{fieldErrors.name}</FieldError> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={batch?.notes ?? ""}
          aria-invalid={Boolean(fieldErrors.notes)}
        />
        {fieldErrors.notes ? <FieldError>{fieldErrors.notes}</FieldError> : null}
      </div>

      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : props.mode === "create" ? "Create batch" : "Save changes"}
      </Button>
    </form>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-destructive">{children}</p>;
}
