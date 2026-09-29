"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toDatetimeLocalValue, toUtcIso } from "@/lib/format-date";
import type { Tables } from "@/lib/supabase/database.types";
import { useIsClient } from "@/lib/use-is-client";
import { assessmentSchema } from "@/lib/validation/assessments";
import { createAssessment, updateAssessment, type AssessmentFormState } from "./assessment-actions";
import { AttachmentUploadField } from "./attachment-upload-field";

const initialState: AssessmentFormState = { error: null, success: false };

type Assessment = Tables<"assessments">;
type Batch = Pick<Tables<"batches">, "id" | "name">;

export function AssessmentForm(
  props:
    | { mode: "create"; courseId: string; batches: Batch[]; onDone: () => void }
    | { mode: "edit"; courseId: string; assessment: Assessment; batches: Batch[]; onDone: () => void },
) {
  const assessment = props.mode === "edit" ? props.assessment : undefined;
  const action =
    props.mode === "create"
      ? createAssessment.bind(null, props.courseId)
      : updateAssessment.bind(null, props.courseId, props.assessment.id);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [type, setType] = useState<string>(assessment?.type ?? "");
  const [batchId, setBatchId] = useState<string>(assessment?.batch_id ?? "");
  const [attachmentPath, setAttachmentPath] = useState<string | null>(assessment?.attachment_path ?? null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // The local-time value depends on the viewer's time zone, which is only
  // known client-side — computing it during the initial render would use the
  // server's time zone instead and mismatch on hydration, so it stays blank
  // until useIsClient flips true. Once the admin edits the field directly,
  // their typed value always wins.
  const isClient = useIsClient();
  const [userEditedDueAt, setUserEditedDueAt] = useState<string | null>(null);
  const dueAtLocal =
    userEditedDueAt ?? (isClient && assessment ? toDatetimeLocalValue(assessment.due_at) : "");

  useEffect(() => {
    if (state.success) props.onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const dueAtUtc = dueAtLocal ? toUtcIso(dueAtLocal) : "";
    formData.set("due_at", dueAtUtc);

    const parsed = assessmentSchema.safeParse({
      type: formData.get("type"),
      title: formData.get("title"),
      instructions: formData.get("instructions"),
      due_at: formData.get("due_at"),
      total_marks: formData.get("total_marks"),
      batch_id: formData.get("batch_id"),
      attachment_path: formData.get("attachment_path"),
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

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={handleSubmit}
      className="space-y-4"
      noValidate
    >
      <input type="hidden" name="due_at" value={dueAtLocal ? toUtcIso(dueAtLocal) : ""} readOnly />
      <input type="hidden" name="attachment_path" value={attachmentPath ?? ""} readOnly />

      <div className="space-y-2">
        <Label htmlFor="assessment-type">Type</Label>
        <Select
          name="type"
          items={{ assignment: "Assignment", test: "Test" }}
          value={type || null}
          onValueChange={(value) => setType(value ?? "")}
        >
          <SelectTrigger id="assessment-type" className="w-full" aria-invalid={Boolean(fieldErrors.type)}>
            <SelectValue placeholder="Choose a type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="assignment">Assignment</SelectItem>
            <SelectItem value="test">Test</SelectItem>
          </SelectContent>
        </Select>
        {fieldErrors.type ? <FieldError>{fieldErrors.type}</FieldError> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="assessment-title">Title</Label>
        <Input
          id="assessment-title"
          name="title"
          defaultValue={assessment?.title ?? ""}
          aria-invalid={Boolean(fieldErrors.title)}
        />
        {fieldErrors.title ? <FieldError>{fieldErrors.title}</FieldError> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="assessment-instructions">Instructions</Label>
        <Textarea
          id="assessment-instructions"
          name="instructions"
          rows={5}
          defaultValue={assessment?.instructions ?? ""}
          aria-invalid={Boolean(fieldErrors.instructions)}
        />
        {fieldErrors.instructions ? <FieldError>{fieldErrors.instructions}</FieldError> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="assessment-due-at">Due date</Label>
          <Input
            id="assessment-due-at"
            type="datetime-local"
            value={dueAtLocal}
            onChange={(event) => setUserEditedDueAt(event.target.value)}
            aria-invalid={Boolean(fieldErrors.due_at)}
          />
          {fieldErrors.due_at ? <FieldError>{fieldErrors.due_at}</FieldError> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="assessment-total-marks">Total marks</Label>
          <Input
            id="assessment-total-marks"
            name="total_marks"
            type="number"
            min="0.1"
            step="0.1"
            defaultValue={assessment?.total_marks ?? ""}
            aria-invalid={Boolean(fieldErrors.total_marks)}
          />
          {fieldErrors.total_marks ? <FieldError>{fieldErrors.total_marks}</FieldError> : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="assessment-batch">Target batch</Label>
        <Select
          name="batch_id"
          items={{ "": "Whole course", ...Object.fromEntries(props.batches.map((b) => [b.id, b.name])) }}
          value={batchId || ""}
          onValueChange={(value) => setBatchId(value ?? "")}
        >
          <SelectTrigger id="assessment-batch" className="w-full">
            <SelectValue placeholder="Whole course" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Whole course</SelectItem>
            {props.batches.map((batch) => (
              <SelectItem key={batch.id} value={batch.id}>
                {batch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Leave as &ldquo;Whole course&rdquo; to show this to everyone enrolled.
        </p>
      </div>

      <AttachmentUploadField courseId={props.courseId} value={attachmentPath} onChange={setAttachmentPath} />

      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => { props.onDone(); router.refresh(); }}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : props.mode === "create" ? "Create assessment" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-destructive">{children}</p>;
}
