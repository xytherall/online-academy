"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/slug";
import type { Tables } from "@/lib/supabase/database.types";
import { courseSchema } from "@/lib/validation/courses";
import { createCourse, updateCourse, type CourseFormState } from "./actions";

const initialState: CourseFormState = { error: null };

type Course = Tables<"courses">;

export function CourseForm(
  props: { mode: "create" } | { mode: "edit"; course: Course },
) {
  const course = props.mode === "edit" ? props.course : undefined;
  const action = props.mode === "create" ? createCourse : updateCourse.bind(null, props.course.id);
  const [state, formAction, isPending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) toast.success("Saved");
  }, [state]);

  const [title, setTitle] = useState(course?.title ?? "");
  const [slug, setSlug] = useState(course?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(props.mode === "edit");
  const [level, setLevel] = useState<string>(course?.level ?? "");
  const [isPublished, setIsPublished] = useState(course?.is_published ?? false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleTitleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function handleSlugChange(event: React.ChangeEvent<HTMLInputElement>) {
    setSlugTouched(true);
    setSlug(event.target.value);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const parsed = courseSchema.safeParse({
      title: formData.get("title"),
      slug: formData.get("slug"),
      level: formData.get("level"),
      description: formData.get("description"),
      is_published: formData.get("is_published"),
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
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          value={title}
          onChange={handleTitleChange}
          aria-invalid={Boolean(fieldErrors.title)}
        />
        {fieldErrors.title ? <FieldError>{fieldErrors.title}</FieldError> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          name="slug"
          value={slug}
          onChange={handleSlugChange}
          aria-invalid={Boolean(fieldErrors.slug)}
        />
        {fieldErrors.slug ? <FieldError>{fieldErrors.slug}</FieldError> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="level">Level</Label>
        <Select
          name="level"
          items={{ O: "O Level", A: "A Level" }}
          value={level || null}
          onValueChange={(value) => setLevel(value ?? "")}
        >
          <SelectTrigger id="level" className="w-full" aria-invalid={Boolean(fieldErrors.level)}>
            <SelectValue placeholder="Choose a level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="O">O Level</SelectItem>
            <SelectItem value="A">A Level</SelectItem>
          </SelectContent>
        </Select>
        {fieldErrors.level ? <FieldError>{fieldErrors.level}</FieldError> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={6}
          defaultValue={course?.description ?? ""}
          aria-invalid={Boolean(fieldErrors.description)}
        />
        {fieldErrors.description ? <FieldError>{fieldErrors.description}</FieldError> : null}
      </div>

      <div className="flex items-center gap-3">
        <Switch
          id="is_published"
          name="is_published"
          value="true"
          uncheckedValue="false"
          checked={isPublished}
          onCheckedChange={setIsPublished}
        />
        <Label htmlFor="is_published">Published</Label>
      </div>

      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : props.mode === "create" ? "Create course" : "Save changes"}
      </Button>
    </form>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-destructive">{children}</p>;
}
