"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { clearMarkedSubmissionFiles } from "./storage-actions";

function formatMegabytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

function filesLabel(count: number): string {
  return `${count} file${count === 1 ? "" : "s"}`;
}

/**
 * Settings card for freeing up storage: removes uploaded files of work that
 * has already been marked, after a confirmation that says exactly how many
 * files and how much space. `summary` is null when it couldn't be loaded.
 */
export function ClearFilesCard({ summary }: { summary: { fileCount: number; totalBytes: number } | null }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClear() {
    startTransition(async () => {
      const result = await clearMarkedSubmissionFiles();
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      toast.success(`${filesLabel(result.removed)} removed`);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Storage</CardTitle>
        <CardDescription>
          Free up space by removing students&apos; uploaded files for work that has already been marked. Marks,
          feedback and reports stay exactly as they are. Unmarked work is never touched.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {summary === null ? (
          <p className="text-sm text-destructive">Could not check how many files there are. Please refresh the page.</p>
        ) : summary.fileCount === 0 ? (
          <p className="text-sm text-muted-foreground">There are no uploaded files of marked work to remove.</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Marked work currently has {filesLabel(summary.fileCount)} ({formatMegabytes(summary.totalBytes)}).
            </p>
            <Dialog
              open={open}
              onOpenChange={(next) => {
                setOpen(next);
                if (next) setError(null);
              }}
            >
              <DialogTrigger render={<Button type="button" variant="outline" />}>Clear uploaded files</DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Remove {filesLabel(summary.fileCount)}?</DialogTitle>
                  <DialogDescription>
                    This permanently deletes {filesLabel(summary.fileCount)} ({formatMegabytes(summary.totalBytes)})
                    uploaded for work that has already been marked. Students and admins will no longer be able to
                    open them. Marks and feedback are kept. This cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                    Cancel
                  </Button>
                  <Button type="button" variant="destructive" onClick={handleClear} disabled={isPending}>
                    {isPending ? "Removing…" : "Remove files"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </CardContent>
    </Card>
  );
}
