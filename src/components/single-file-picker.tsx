"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    event.target.value = "";
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
        <div className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 truncate text-sm">{file.name}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)} disabled={disabled}>
            Remove
          </Button>
        </div>
      ) : (
        <>
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept={ALLOWED_RESOURCE_MIME_TYPES.join(",")}
            onChange={handleChange}
            disabled={disabled}
            className="block text-sm"
          />
          <p className="text-xs text-muted-foreground">PDF, JPG, PNG or WEBP. Max 10 MB. Optional.</p>
        </>
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
