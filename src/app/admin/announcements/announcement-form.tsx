"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AnnouncementBody } from "@/components/announcement-body";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Tables } from "@/lib/supabase/database.types";
import { announcementSchema } from "@/lib/validation/announcements";
import { createAnnouncement, updateAnnouncement, type AnnouncementFormState } from "./actions";

const initialState: AnnouncementFormState = { error: null, success: false };

type Announcement = Tables<"announcements">;
type Course = Pick<Tables<"courses">, "id" | "title">;
type Batch = Pick<Tables<"batches">, "id" | "name">;

type TargetType = "everyone" | "course" | "batch";

function targetTypeFor(announcement: Announcement | undefined): TargetType {
  if (announcement?.course_id) return "course";
  if (announcement?.batch_id) return "batch";
  return "everyone";
}

export function AnnouncementForm(
  props:
    | { mode: "create"; courses: Course[]; batches: Batch[]; onDone: () => void }
    | { mode: "edit"; announcement: Announcement; courses: Course[]; batches: Batch[]; onDone: () => void },
) {
  const announcement = props.mode === "edit" ? props.announcement : undefined;
  const action =
    props.mode === "create" ? createAnnouncement : updateAnnouncement.bind(null, props.announcement.id);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const router = useRouter();

  const [title, setTitle] = useState(announcement?.title ?? "");
  const [body, setBody] = useState(announcement?.body ?? "");
  const [targetType, setTargetType] = useState<TargetType>(targetTypeFor(announcement));
  const [courseId, setCourseId] = useState<string>(announcement?.course_id ?? "");
  const [batchId, setBatchId] = useState<string>(announcement?.batch_id ?? "");
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
      target_type: formData.get("target_type"),
      course_id: formData.get("course_id"),
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

      <div className="space-y-2">
        <Label htmlFor="announcement-target">Target</Label>
        <Select
          name="target_type"
          items={{ everyone: "Everyone", course: "One course", batch: "One batch" }}
          value={targetType}
          onValueChange={(value) => setTargetType((value as TargetType) ?? "everyone")}
        >
          <SelectTrigger id="announcement-target" className="w-full">
            <SelectValue placeholder="Choose a target" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="everyone">Everyone</SelectItem>
            <SelectItem value="course">One course</SelectItem>
            <SelectItem value="batch">One batch</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {targetType === "course" ? (
        <div className="space-y-2">
          <Label htmlFor="announcement-course">Course</Label>
          <Select
            name="course_id"
            items={Object.fromEntries(props.courses.map((c) => [c.id, c.title]))}
            value={courseId || null}
            onValueChange={(value) => setCourseId(value ?? "")}
          >
            <SelectTrigger id="announcement-course" className="w-full" aria-invalid={Boolean(fieldErrors.course_id)}>
              <SelectValue placeholder="Choose a course" />
            </SelectTrigger>
            <SelectContent>
              {props.courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldErrors.course_id ? <FieldError>{fieldErrors.course_id}</FieldError> : null}
        </div>
      ) : null}

      {targetType === "batch" ? (
        <div className="space-y-2">
          <Label htmlFor="announcement-batch">Batch</Label>
          <Select
            name="batch_id"
            items={Object.fromEntries(props.batches.map((b) => [b.id, b.name]))}
            value={batchId || null}
            onValueChange={(value) => setBatchId(value ?? "")}
          >
            <SelectTrigger id="announcement-batch" className="w-full" aria-invalid={Boolean(fieldErrors.batch_id)}>
              <SelectValue placeholder="Choose a batch" />
            </SelectTrigger>
            <SelectContent>
              {props.batches.map((batch) => (
                <SelectItem key={batch.id} value={batch.id}>
                  {batch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldErrors.batch_id ? <FieldError>{fieldErrors.batch_id}</FieldError> : null}
        </div>
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
