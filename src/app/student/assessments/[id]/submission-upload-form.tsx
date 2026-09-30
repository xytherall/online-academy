"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { compressImage } from "@/lib/compress-image";
import { createClient } from "@/lib/supabase/client";
import { ALLOWED_RESOURCE_MIME_TYPES, MAX_RESOURCE_FILE_BYTES } from "@/lib/validation/assessments";
import { MAX_SUBMISSION_FILES } from "@/lib/validation/submissions";
import { submitAssignment } from "./actions";

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

export function SubmissionUploadForm({
  assessmentId,
  studentId,
  dueAt,
}: {
  assessmentId: string;
  studentId: string;
  dueAt: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  // Read once on mount — the confirmation dialog uses this to warn about a
  // late submission; it doesn't need to tick live while the form is open.
  const [isLate] = useState(() => new Date() > new Date(dueAt));

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (selected.length === 0) return;

    setError(null);
    const next = [...files];

    for (const file of selected) {
      if (!ALLOWED_RESOURCE_MIME_TYPES.includes(file.type)) {
        setError("Files must be PDF, JPG, PNG or WEBP.");
        continue;
      }
      if (file.size > MAX_RESOURCE_FILE_BYTES) {
        setError(`"${file.name}" is larger than 10 MB.`);
        continue;
      }
      if (next.length >= MAX_SUBMISSION_FILES) {
        setError(`You can submit up to ${MAX_SUBMISSION_FILES} files.`);
        break;
      }
      next.push(file);
    }

    setFiles(next);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleConfirmSubmit() {
    setIsSubmitting(true);
    setError(null);

    const supabase = createClient();
    const uploadedPaths: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        setProgress(`Uploading ${i + 1} of ${files.length}…`);
        const compressed = await compressImage(files[i]);
        const path = `${assessmentId}/${studentId}/${crypto.randomUUID()}-${sanitizeFilename(compressed.name)}`;
        const { error: uploadError } = await supabase.storage
          .from("submissions")
          .upload(path, compressed, { contentType: compressed.type });

        if (uploadError) {
          // Clean up whatever made it to storage before the failure — the
          // student's DELETE policy allows this only while no submission row
          // exists yet, which holds here since we haven't called the RPC.
          if (uploadedPaths.length > 0) {
            await supabase.storage.from("submissions").remove(uploadedPaths);
          }
          setError("Could not upload your files. Please try again.");
          return;
        }
        uploadedPaths.push(path);
      }

      setProgress("Submitting…");
      const result = await submitAssignment(assessmentId, uploadedPaths);

      if (result.error) {
        setError(result.error);
        setConfirmOpen(false);
        return;
      }

      setConfirmOpen(false);
      router.refresh();
    } catch {
      // A crashed upload/compression step must not leave the dialog stuck
      // on "Uploading…" forever — clean up and surface a retryable error.
      if (uploadedPaths.length > 0) {
        await supabase.storage.from("submissions").remove(uploadedPaths);
      }
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
      setProgress(null);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_RESOURCE_MIME_TYPES.join(",")}
          onChange={handleFileChange}
          disabled={isSubmitting}
          className="block text-sm"
        />
        <p className="text-xs text-muted-foreground">
          PDF, JPG, PNG or WEBP. Max 10 MB per file, up to {MAX_SUBMISSION_FILES} files.
        </p>
      </div>

      {files.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-2">
              <span className="truncate">{file.name}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeFile(index)} disabled={isSubmitting}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="button" disabled={files.length === 0 || isSubmitting} onClick={() => setConfirmOpen(true)}>
        Submit
      </Button>

      <Dialog open={confirmOpen} onOpenChange={(next) => !isSubmitting && setConfirmOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit this assignment?</DialogTitle>
            <DialogDescription>
              Submissions are final and cannot be edited or replaced once sent.
              {isLate ? " This is past the due date, so your submission will be marked late." : ""}
            </DialogDescription>
          </DialogHeader>
          {progress ? <p className="text-sm text-muted-foreground">{progress}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="button" onClick={handleConfirmSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Submitting…" : "Confirm submission"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
