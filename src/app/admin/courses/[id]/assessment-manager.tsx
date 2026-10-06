"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { LocalDateTime } from "@/components/local-date-time";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Tables } from "@/lib/supabase/database.types";
import { deleteAssessment, getSignedAttachmentUrlByPath } from "./assessment-actions";
import { AssessmentForm, type QuizEditInfo } from "./assessment-form";
import { assessmentTypeLabel } from "@/lib/assessment-type";

type Assessment = Tables<"assessments">;
type Batch = Pick<Tables<"batches">, "id" | "name">;

export function AssessmentManager({
  courseId,
  assessments,
  quizzes,
  batches,
}: {
  courseId: string;
  assessments: Assessment[];
  /** Saved questions and lock state for each quiz, by assessment id. */
  quizzes: Record<string, QuizEditInfo>;
  batches: Batch[];
}) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-medium">Assessments</h2>
          <p className="text-sm text-muted-foreground">Assignments and tests for this course.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button type="button" size="sm" />}>New assessment</DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>New assessment</DialogTitle>
            </DialogHeader>
            <AssessmentForm
              mode="create"
              courseId={courseId}
              batches={batches}
              onDone={() => setCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {assessments.length === 0 ? (
        <EmptyState title="No assessments yet" description="Create one above." />
      ) : (
        <ul className="space-y-2">
          {assessments.map((assessment) => (
            <AssessmentRow
              key={assessment.id}
              courseId={courseId}
              assessment={assessment}
              quiz={quizzes[assessment.id] ?? null}
              batches={batches}
              batchName={batches.find((b) => b.id === assessment.batch_id)?.name ?? null}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function AssessmentRow({
  courseId,
  assessment,
  quiz,
  batches,
  batchName,
}: {
  courseId: string;
  assessment: Assessment;
  quiz: QuizEditInfo | null;
  batches: Batch[];
  batchName: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);

  function handleDelete() {
    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteAssessment(courseId, assessment.id);
      if (result.error) {
        setDeleteError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success("Deleted");
      setDeleteOpen(false);
      router.refresh();
    });
  }

  async function handleViewAttachment() {
    if (!assessment.attachment_path) return;
    setViewError(null);
    const result = await getSignedAttachmentUrlByPath(assessment.attachment_path);
    if (result.error || !result.url) {
      setViewError(result.error ?? "Could not open the file.");
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  return (
    <li className="rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium">{assessment.title}</p>
            <Badge variant="secondary">{assessmentTypeLabel(assessment.type)}</Badge>
            <Badge variant="outline">{batchName ?? "Whole course"}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Due <LocalDateTime iso={assessment.due_at} /> · {assessment.total_marks} marks
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/admin/assessments/${assessment.id}`} />}
            nativeButton={false}
          >
            Marking
          </Button>

          {assessment.attachment_path ? (
            <Button type="button" variant="outline" size="sm" onClick={handleViewAttachment}>
              View attachment
            </Button>
          ) : null}

          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>Edit</DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit &ldquo;{assessment.title}&rdquo;</DialogTitle>
              </DialogHeader>
              <AssessmentForm
                mode="edit"
                courseId={courseId}
                assessment={assessment}
                quiz={quiz}
                batches={batches}
                onDone={() => setEditOpen(false)}
              />
            </DialogContent>
          </Dialog>

          <Dialog
            open={deleteOpen}
            onOpenChange={(next) => {
              setDeleteOpen(next);
              if (next) setDeleteError(null);
            }}
          >
            <DialogTrigger
              render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Delete assessment" />}
            >
              <Trash2Icon />
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete &ldquo;{assessment.title}&rdquo;?</DialogTitle>
                <DialogDescription>
                  This cannot be undone. An assessment with submissions or marks can&apos;t be deleted.
                </DialogDescription>
              </DialogHeader>
              {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)} disabled={isPending}>
                  Cancel
                </Button>
                <Button type="button" variant="destructive" onClick={handleDelete} disabled={isPending}>
                  {isPending ? "Deleting…" : "Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {viewError ? (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>{viewError}</AlertDescription>
        </Alert>
      ) : null}
    </li>
  );
}
