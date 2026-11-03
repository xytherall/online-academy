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
import { toDatetimeLocalValue, toUtcIso } from "@/lib/format-date";
import type { Tables } from "@/lib/supabase/database.types";
import { useIsClient } from "@/lib/use-is-client";
import { EVERYONE_VALUE, liveClassSchema } from "@/lib/validation/live-classes";
import { createLiveClass, updateLiveClass, type LiveClassFormState } from "./actions";

const initialState: LiveClassFormState = { error: null, success: false };

type LiveClass = Tables<"live_classes">;
type Batch = Pick<Tables<"batches">, "id" | "name">;
type Course = Pick<Tables<"courses">, "id" | "title">;

export function LiveClassForm(
  props:
    | { mode: "create"; batches: Batch[]; courses: Course[]; onDone: () => void }
    | { mode: "edit"; liveClass: LiveClass; batches: Batch[]; courses: Course[]; onDone: () => void },
) {
  const liveClass = props.mode === "edit" ? props.liveClass : undefined;
  const action = props.mode === "create" ? createLiveClass : updateLiveClass.bind(null, props.liveClass.id);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const router = useRouter();

  const [title, setTitle] = useState(liveClass?.title ?? "");
  const [joinUrl, setJoinUrl] = useState(liveClass?.join_url ?? "");
  const [note, setNote] = useState(liveClass?.note ?? "");
  const [batchId, setBatchId] = useState<string>(liveClass?.batch_id ?? EVERYONE_VALUE);
  const [courseId, setCourseId] = useState<string>(liveClass?.course_id ?? EVERYONE_VALUE);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // The time is entered in the admin's own (device) time zone, like
  // assessment due dates. That zone is only known client-side, so the edit
  // value stays blank until after hydration; a typed value always wins.
  const isClient = useIsClient();
  const [userEditedStartsAt, setUserEditedStartsAt] = useState<string | null>(null);
  const startsAtLocal =
    userEditedStartsAt ?? (isClient && liveClass ? toDatetimeLocalValue(liveClass.starts_at) : "");

  useEffect(() => {
    if (state.success) {
      toast.success("Saved");
      props.onDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    formData.set("starts_at", startsAtLocal ? toUtcIso(startsAtLocal) : "");

    const parsed = liveClassSchema.safeParse({
      title: formData.get("title"),
      starts_at: formData.get("starts_at"),
      join_url: formData.get("join_url"),
      note: formData.get("note"),
      batch_id: formData.get("batch_id"),
      course_id: formData.get("course_id"),
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
    [EVERYONE_VALUE]: "All batches",
    ...Object.fromEntries(props.batches.map((b) => [b.id, b.name])),
  };

  const courseItems = {
    [EVERYONE_VALUE]: "All courses",
    ...Object.fromEntries(props.courses.map((c) => [c.id, c.title])),
  };

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-4" noValidate>
      <input type="hidden" name="starts_at" value={startsAtLocal ? toUtcIso(startsAtLocal) : ""} readOnly />

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
        <Label htmlFor="live-class-starts-at">Date and time</Label>
        <Input
          id="live-class-starts-at"
          type="datetime-local"
          value={startsAtLocal}
          onChange={(event) => setUserEditedStartsAt(event.target.value)}
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
        <Label htmlFor="live-class-course">Course</Label>
        <Select
          name="course_id"
          items={courseItems}
          value={courseId}
          onValueChange={(value) => setCourseId(value ?? EVERYONE_VALUE)}
        >
          <SelectTrigger id="live-class-course" className="w-full" aria-invalid={Boolean(fieldErrors.course_id)}>
            <SelectValue placeholder="Choose a course" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={EVERYONE_VALUE}>All courses</SelectItem>
            {props.courses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldErrors.course_id ? <FieldError>{fieldErrors.course_id}</FieldError> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="live-class-batch">Batch</Label>
        <Select
          name="batch_id"
          items={batchItems}
          value={batchId}
          onValueChange={(value) => setBatchId(value ?? EVERYONE_VALUE)}
        >
          <SelectTrigger id="live-class-batch" className="w-full" aria-invalid={Boolean(fieldErrors.batch_id)}>
            <SelectValue placeholder="Choose a batch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={EVERYONE_VALUE}>All batches</SelectItem>
            {props.batches.map((batch) => (
              <SelectItem key={batch.id} value={batch.id}>
                {batch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldErrors.batch_id ? <FieldError>{fieldErrors.batch_id}</FieldError> : null}
        <p className="text-sm text-muted-foreground">
          Only students who match both see the class: enrolled in the course and in the batch.
        </p>
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
