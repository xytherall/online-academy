"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileDropzone, SelectedFile } from "@/components/file-dropzone";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { ALLOWED_RESOURCE_MIME_TYPES, MAX_RESOURCE_FILE_BYTES } from "@/lib/validation/resources";
import { createFileResource } from "./resource-actions";

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

export function FileUploadField({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  function handleFiles([selected]: File[]) {
    setError(null);
    if (!selected) return;

    if (!ALLOWED_RESOURCE_MIME_TYPES.includes(selected.type)) {
      setError("File must be a PDF, JPG, PNG or WEBP.");
      return;
    }
    if (selected.size > MAX_RESOURCE_FILE_BYTES) {
      setError("File must be 10 MB or smaller.");
      return;
    }
    setFile(selected);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }

    setIsPending(true);

    const path = `${courseId}/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;
    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from("course-files")
      .upload(path, file, { contentType: file.type });

    if (uploadError) {
      setIsPending(false);
      setError("Could not upload the file. Please try again.");
      return;
    }

    const result = await createFileResource(courseId, { title: title.trim(), file_path: path });
    setIsPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    toast.success("Added");
    setTitle("");
    setFile(null);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="file-resource-title">Title</Label>
        <Input
          id="file-resource-title"
          value={title}
          placeholder="For example: Chapter 4 notes"
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="file-resource-file">File</Label>
        {file ? (
          <SelectedFile file={file} onRemove={() => setFile(null)} disabled={isPending} />
        ) : (
          <FileDropzone
            id="file-resource-file"
            accept={ALLOWED_RESOURCE_MIME_TYPES.join(",")}
            onFiles={handleFiles}
            disabled={isPending}
            hint="PDF, JPG, PNG or WEBP. Max 10 MB."
          />
        )}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Uploading…" : "Add file"}
      </Button>
    </form>
  );
}
