"use client";

import { useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { ALLOWED_RESOURCE_MIME_TYPES, MAX_RESOURCE_FILE_BYTES } from "@/lib/validation/assessments";
import { getSignedAttachmentUrlByPath } from "./assessment-actions";

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

function filenameFromPath(path: string): string {
  const lastSegment = path.split("/").pop() ?? path;
  // Strips the "<uuid>-" prefix added at upload time, if present.
  return lastSegment.replace(/^[0-9a-f-]{36}-/, "");
}

export function AttachmentUploadField({
  courseId,
  value,
  onChange,
}: {
  courseId: string;
  value: string | null;
  onChange: (path: string | null) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setError(null);
    if (!selected) return;

    if (!ALLOWED_RESOURCE_MIME_TYPES.includes(selected.type)) {
      setError("File must be a PDF, JPG, PNG or WEBP.");
      event.target.value = "";
      return;
    }
    if (selected.size > MAX_RESOURCE_FILE_BYTES) {
      setError("File must be 10 MB or smaller.");
      event.target.value = "";
      return;
    }

    setIsUploading(true);
    const path = `${courseId}/assessments/${crypto.randomUUID()}-${sanitizeFilename(selected.name)}`;
    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from("course-files")
      .upload(path, selected, { contentType: selected.type });
    setIsUploading(false);
    event.target.value = "";

    if (uploadError) {
      setError("Could not upload the file. Please try again.");
      return;
    }

    onChange(path);
    setIsReplacing(false);
  }

  async function handleView() {
    if (!value) return;
    setViewError(null);
    const result = await getSignedAttachmentUrlByPath(value);
    if (result.error || !result.url) {
      setViewError(result.error ?? "Could not open the file.");
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-2">
      <Label>Attachment</Label>

      {value && !isReplacing ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">{filenameFromPath(value)}</span>
          <Button type="button" variant="outline" size="sm" onClick={handleView}>
            View
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setIsReplacing(true)}>
            Replace
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            Remove
          </Button>
        </div>
      ) : (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_RESOURCE_MIME_TYPES.join(",")}
            onChange={handleFileChange}
            disabled={isUploading}
            className="block text-sm"
          />
          <p className="text-xs text-muted-foreground">
            {isUploading ? "Uploading…" : "PDF, JPG, PNG or WEBP. Max 10 MB. Optional."}
          </p>
        </>
      )}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {viewError ? (
        <Alert variant="destructive">
          <AlertDescription>{viewError}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
