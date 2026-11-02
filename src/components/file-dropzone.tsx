"use client";

import { useRef, useState } from "react";
import { FileTextIcon, ImageIcon, UploadIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * A clear "Choose file" area for every upload in the portal and admin: a
 * dashed box with a real button and drag-and-drop, instead of the browser's
 * bare file input. Validation stays with the caller (`onFiles` gets the raw
 * selection); this component only picks files.
 */
export function FileDropzone({
  id,
  accept,
  multiple = false,
  disabled = false,
  hint,
  buttonLabel,
  onFiles,
}: {
  id?: string;
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  hint: string;
  buttonLabel?: string;
  onFiles: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const label = buttonLabel ?? (multiple ? "Choose files" : "Choose a file");

  function pick(list: FileList | null) {
    const files = Array.from(list ?? []);
    if (files.length > 0) onFiles(multiple ? files : files.slice(0, 1));
  }

  return (
    <div
      onDragOver={(event) => {
        if (disabled) return;
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        if (!disabled) pick(event.dataTransfer.files);
      }}
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors",
        isDragging ? "border-primary bg-primary-soft" : "border-border bg-muted/40",
        disabled && "opacity-60",
      )}
    >
      <span aria-hidden className="grid size-11 place-items-center rounded-full bg-primary-soft text-primary">
        <UploadIcon className="size-5" />
      </span>
      <Button type="button" disabled={disabled} onClick={() => inputRef.current?.click()}>
        {label}
      </Button>
      <p className="text-sm text-muted-foreground">
        <span className="hidden sm:inline">or drag {multiple ? "them" : "it"} here. </span>
        {hint}
      </p>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          pick(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}

/** One picked file shown as a row with its size and a clear Remove button. */
export function SelectedFile({
  file,
  onRemove,
  disabled = false,
}: {
  file: { name: string; size?: number; type?: string };
  onRemove?: () => void;
  disabled?: boolean;
}) {
  const Icon = file.type?.startsWith("image/") ? ImageIcon : FileTextIcon;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{file.name}</span>
        {file.size !== undefined ? (
          <span className="block text-xs text-muted-foreground">{formatSize(file.size)}</span>
        ) : null}
      </span>
      {onRemove ? (
        <Button type="button" variant="ghost" size="sm" onClick={onRemove} disabled={disabled}>
          <XIcon aria-hidden className="size-4" />
          Remove
        </Button>
      ) : null}
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
