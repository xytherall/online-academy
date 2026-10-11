"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Tables } from "@/lib/supabase/database.types";
import { lectureSchema } from "@/lib/validation/lectures";
import { fromStoredVimeoId, vimeoPageUrl } from "@/lib/vimeo";
import { createLecture, updateLecture, type LectureFormState } from "./lecture-actions";

const initialState: LectureFormState = { error: null, success: false };

type Lecture = Tables<"lectures">;

function storedToLink(vimeoId: string): string {
  const video = fromStoredVimeoId(vimeoId);
  return video ? vimeoPageUrl(video) : "";
}

export function LectureForm(
  props:
    | { mode: "create"; courseId: string; onDone: () => void }
    | { mode: "edit"; courseId: string; lecture: Lecture; onDone: () => void },
) {
  const lecture = props.mode === "edit" ? props.lecture : undefined;
  const action =
    props.mode === "create"
      ? createLecture.bind(null, props.courseId)
      : updateLecture.bind(null, props.courseId, props.lecture.id);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const router = useRouter();

  const [title, setTitle] = useState(lecture?.title ?? "");
  const [vimeoUrl, setVimeoUrl] = useState(lecture ? storedToLink(lecture.vimeo_id) : "");
  const [description, setDescription] = useState(lecture?.description ?? "");
  const [isPublished, setIsPublished] = useState(lecture?.is_published ?? false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (state.success) {
      toast.success("Saved");
      router.refresh();
      props.onDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const parsed = lectureSchema.safeParse({
      title: formData.get("title"),
      vimeo_url: formData.get("vimeo_url"),
      description: formData.get("description"),
      is_published: formData.get("is_published"),
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

  const firstShow = isPublished && !lecture?.published_at;

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="lecture-title">Title</Label>
        <Input
          id="lecture-title"
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-invalid={Boolean(fieldErrors.title)}
        />
        {fieldErrors.title ? <FieldError>{fieldErrors.title}</FieldError> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="lecture-vimeo-url">Vimeo link</Label>
        <Input
          id="lecture-vimeo-url"
          name="vimeo_url"
          type="url"
          inputMode="url"
          placeholder="https://vimeo.com/123456789"
          value={vimeoUrl}
          onChange={(event) => setVimeoUrl(event.target.value)}
          aria-invalid={Boolean(fieldErrors.vimeo_url)}
          aria-describedby="lecture-vimeo-url-help"
        />
        <p id="lecture-vimeo-url-help" className="text-xs text-muted-foreground">
          The video&rsquo;s link from Vimeo, including the private part of an unlisted link.
        </p>
        {fieldErrors.vimeo_url ? <FieldError>{fieldErrors.vimeo_url}</FieldError> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="lecture-description">Note (optional)</Label>
        <Textarea
          id="lecture-description"
          name="description"
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          aria-invalid={Boolean(fieldErrors.description)}
        />
        {fieldErrors.description ? <FieldError>{fieldErrors.description}</FieldError> : null}
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <Switch
            id="lecture-is-published"
            name="is_published"
            value="true"
            uncheckedValue="false"
            checked={isPublished}
            onCheckedChange={setIsPublished}
          />
          <Label htmlFor="lecture-is-published">Show to students</Label>
        </div>
        {firstShow ? (
          <p className="text-xs text-muted-foreground">Students in this course are notified when you save.</p>
        ) : null}
      </div>

      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : props.mode === "create" ? "Add lecture" : "Save changes"}
      </Button>
    </form>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-destructive">{children}</p>;
}
