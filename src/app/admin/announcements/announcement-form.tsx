"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TargetCheckboxes } from "@/components/admin/target-checkboxes";
import { AnnouncementBody } from "@/components/announcement-body";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Tables } from "@/lib/supabase/database.types";
import { announcementSchema } from "@/lib/validation/announcements";
import { createAnnouncement, updateAnnouncement, type AnnouncementFormState } from "./actions";
import type { AdminAnnouncement } from "./announcement-manager";

const initialState: AnnouncementFormState = { error: null, success: false };

type Course = Pick<Tables<"courses">, "id" | "title">;
type Batch = Pick<Tables<"batches">, "id" | "name">;

export function AnnouncementForm(
  props:
    | { mode: "create"; courses: Course[]; batches: Batch[]; onDone: () => void }
    | { mode: "edit"; announcement: AdminAnnouncement; courses: Course[]; batches: Batch[]; onDone: () => void },
) {
  const announcement = props.mode === "edit" ? props.announcement : undefined;
  const action =
    props.mode === "create" ? createAnnouncement : updateAnnouncement.bind(null, props.announcement.id);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const router = useRouter();

  const [title, setTitle] = useState(announcement?.title ?? "");
  const [body, setBody] = useState(announcement?.body ?? "");
  const [courseIds, setCourseIds] = useState<string[]>(announcement?.course_ids ?? []);
  const [batchIds, setBatchIds] = useState<string[]>(announcement?.batch_ids ?? []);
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

    const parsed = announcementSchema.safeParse({
      title: formData.get("title"),
      body: formData.get("body"),
      course_ids: formData.getAll("course_ids"),
      batch_ids: formData.getAll("batch_ids"),
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
    <form action={formAction} onSubmit={handleSubmit} className="space-y-4" noValidate>

      <div className="space-y-2">
        <Label htmlFor="announcement-title">Title</Label>
        <Input
          id="announcement-title"
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-invalid={Boolean(fieldErrors.title)}
        />
        {fieldErrors.title ? <FieldError>{fieldErrors.title}</FieldError> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="announcement-body">Body</Label>
        <Textarea
          id="announcement-body"
          name="body"
          rows={6}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          aria-invalid={Boolean(fieldErrors.body)}
        />
        {fieldErrors.body ? <FieldError>{fieldErrors.body}</FieldError> : null}
        {body.trim() ? (
          <div className="rounded-md border border-border bg-muted/40 p-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Preview</p>
            <AnnouncementBody body={body} className="text-sm" />
          </div>
        ) : null}
      </div>

      <TargetCheckboxes
        legend="Courses"
        name="course_ids"
        allLabel="All courses"
        emptyNote="No courses yet."
        options={props.courses.map((course) => ({ id: course.id, label: course.title }))}
        selected={courseIds}
        onChange={setCourseIds}
        error={fieldErrors.course_ids}
      />

      <TargetCheckboxes
        legend="Batches"
        name="batch_ids"
        allLabel="All batches"
        emptyNote="No batches yet."
        options={props.batches.map((batch) => ({ id: batch.id, label: batch.name }))}
        selected={batchIds}
        onChange={setBatchIds}
        error={fieldErrors.batch_ids}
      />

      <p className="text-sm text-muted-foreground">
        Only students who match both see it: enrolled in one of the courses and in one of the batches.
      </p>

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
          {isPending ? "Saving…" : props.mode === "create" ? "Create announcement" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-destructive">{children}</p>;
}
