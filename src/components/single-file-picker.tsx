"use client";

import { useState } from "react";
import { FileDropzone, SelectedFile } from "@/components/file-dropzone";
import { ALLOWED_RESOURCE_MIME_TYPES, MAX_RESOURCE_FILE_BYTES } from "@/lib/validation/resources";

/**
 * Picks one optional file (PDF/JPG/PNG/WEBP, max 10 MB) and holds it until
 * the form is submitted; the caller does the upload.
 */
export function SingleFilePicker({
  id,
  file,
  onChange,
  disabled,
}: {
  id: string;
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);

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
    onChange(selected);
  }

  return (
    <div className="space-y-2">
      {file ? (
        <SelectedFile file={file} onRemove={() => onChange(null)} disabled={disabled} />
      ) : (
        <FileDropzone
          id={id}
          accept={ALLOWED_RESOURCE_MIME_TYPES.join(",")}
          onFiles={handleFiles}
          disabled={disabled}
          hint="PDF, JPG, PNG or WEBP. Max 10 MB. Optional."
        />
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
