"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setError(null);

    if (!selected) {
      setFile(null);
      return;
    }
    if (!ALLOWED_RESOURCE_MIME_TYPES.includes(selected.type)) {
      setError("File must be a PDF, JPG, PNG or WEBP.");
      setFile(null);
      event.target.value = "";
      return;
    }
    if (selected.size > MAX_RESOURCE_FILE_BYTES) {
      setError("File must be 10 MB or smaller.");
      setFile(null);
      event.target.value = "";
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

    setTitle("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="file-resource-title">Title</Label>
        <Input id="file-resource-title" value={title} onChange={(event) => setTitle(event.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="file-resource-file">File</Label>
        <input
          ref={fileInputRef}
          id="file-resource-file"
          type="file"
          accept={ALLOWED_RESOURCE_MIME_TYPES.join(",")}
          onChange={handleFileChange}
          className="block text-sm"
        />
        <p className="text-xs text-muted-foreground">PDF, JPG, PNG or WEBP. Max 10 MB.</p>
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
