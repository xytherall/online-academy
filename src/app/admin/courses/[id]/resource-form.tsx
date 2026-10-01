"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { linkResourceSchema } from "@/lib/validation/resources";
import { createLinkResource, type CreateLinkResourceState } from "./resource-actions";
import { FileUploadField } from "./file-upload-field";

const initialState: CreateLinkResourceState = { error: null, success: false };

export function ResourceForm({ courseId }: { courseId: string }) {
  const [kind, setKind] = useState<"link" | "file">("link");

  return (
    <div className="max-w-xl space-y-4 rounded-lg border border-border bg-card p-4">
      <h3 className="font-medium">Add resource</h3>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={kind === "link" ? "default" : "outline"}
          onClick={() => setKind("link")}
        >
          Link
        </Button>
        <Button
          type="button"
          size="sm"
          variant={kind === "file" ? "default" : "outline"}
          onClick={() => setKind("file")}
        >
          File
        </Button>
      </div>

      {kind === "link" ? <LinkResourceForm courseId={courseId} /> : <FileUploadField courseId={courseId} />}
    </div>
  );
}

function LinkResourceForm({ courseId }: { courseId: string }) {
  const router = useRouter();
  const action = createLinkResource.bind(null, courseId);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      toast.success("Added");
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const parsed = linkResourceSchema.safeParse({
      title: formData.get("title"),
      kind: "link",
      url: formData.get("url"),
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
    <form ref={formRef} action={formAction} onSubmit={handleSubmit} className="space-y-3" noValidate>
      <div className="space-y-2">
        <Label htmlFor="resource-title">Title</Label>
        <Input id="resource-title" name="title" aria-invalid={Boolean(fieldErrors.title)} />
        {fieldErrors.title ? <FieldError>{fieldErrors.title}</FieldError> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="resource-url">URL</Label>
        <Input
          id="resource-url"
          name="url"
          placeholder="https://…"
          aria-invalid={Boolean(fieldErrors.url)}
        />
        {fieldErrors.url ? <FieldError>{fieldErrors.url}</FieldError> : null}
      </div>

      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Adding…" : "Add link"}
      </Button>
    </form>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-destructive">{children}</p>;
}
