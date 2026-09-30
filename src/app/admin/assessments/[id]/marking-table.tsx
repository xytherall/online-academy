"use client";

import { useState, useTransition } from "react";
import { EmptyState } from "@/components/admin/empty-state";
import { LocalDateTime } from "@/components/local-date-time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Tables } from "@/lib/supabase/database.types";
import { saveMarks } from "./actions";

type Submission = Tables<"submissions">;
type Student = { id: string; full_name: string | null; email: string };

export function MarkingTable({
  assessmentId,
  totalMarks,
  entries,
}: {
  assessmentId: string;
  totalMarks: number;
  entries: { student: Student; submission: Submission | null }[];
}) {
  if (entries.length === 0) {
    return (
      <EmptyState title="No students yet" description="No student currently applies to this assessment." />
    );
  }

  return (
    <ul className="space-y-3">
      {entries.map((entry) => (
        <MarkingRow key={entry.student.id} assessmentId={assessmentId} totalMarks={totalMarks} {...entry} />
      ))}
    </ul>
  );
}

function MarkingRow({
  assessmentId,
  totalMarks,
  student,
  submission,
}: {
  assessmentId: string;
  totalMarks: number;
  student: Student;
  submission: Submission | null;
}) {
  const [marks, setMarks] = useState(submission?.marks != null ? String(submission.marks) : "");
  const [feedback, setFeedback] = useState(submission?.feedback ?? "");
  const [countsTowardReport, setCountsTowardReport] = useState(submission?.counts_toward_report ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveMarks(assessmentId, student.id, {
        marks,
        feedback,
        counts_toward_report: countsTowardReport,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <li className="space-y-3 rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{student.full_name ?? student.email}</p>
          <p className="text-xs text-muted-foreground">
            {submission?.submitted_at ? (
              <>
                Submitted <LocalDateTime iso={submission.submitted_at} />
                {submission.is_late ? " · Late" : ""}
              </>
            ) : submission?.marks != null ? (
              "Marked without an upload"
            ) : (
              "Not submitted"
            )}
          </p>
        </div>
        {submission?.marks != null ? <Badge variant="secondary">Marked</Badge> : null}
      </div>

      {submission && submission.file_paths.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {submission.file_paths.map((_, index) => (
            <a
              key={index}
              href={`/admin/submissions/${submission.id}/files/${index}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium hover:underline"
            >
              File {index + 1}
            </a>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
        <div className="space-y-1">
          <Label htmlFor={`marks-${student.id}`}>Marks (of {totalMarks})</Label>
          <Input
            id={`marks-${student.id}`}
            type="number"
            min={0}
            max={totalMarks}
            step={0.1}
            value={marks}
            onChange={(event) => setMarks(event.target.value)}
            disabled={isPending}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`feedback-${student.id}`}>Feedback</Label>
          <Textarea
            id={`feedback-${student.id}`}
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            disabled={isPending}
            rows={2}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Switch
            id={`counts-${student.id}`}
            checked={countsTowardReport}
            onCheckedChange={setCountsTowardReport}
            disabled={isPending}
          />
          <Label htmlFor={`counts-${student.id}`}>Counts toward report</Label>
        </div>
        <Button type="button" size="sm" onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving…" : "Save"}
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {saved && !error ? <p className="text-sm text-muted-foreground">Saved.</p> : null}
    </li>
  );
}
