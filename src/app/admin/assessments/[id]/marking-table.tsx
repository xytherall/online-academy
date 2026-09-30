"use client";

import { useState, useTransition } from "react";
import { EmptyState } from "@/components/admin/empty-state";
import { LocalDateTime } from "@/components/local-date-time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-40">Student</TableHead>
            <TableHead className="w-28">Marks</TableHead>
            <TableHead className="min-w-48">Feedback</TableHead>
            <TableHead className="w-40">Counts</TableHead>
            <TableHead className="w-24 text-right">Save</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <MarkingRow key={entry.student.id} assessmentId={assessmentId} totalMarks={totalMarks} {...entry} />
          ))}
        </TableBody>
      </Table>
    </div>
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
    <TableRow>
      <TableCell className="align-top">
        <p className="font-medium">{student.full_name ?? student.email}</p>
        <p className="text-xs text-muted-foreground">
          {submission?.submitted_at ? (
            <>
              Submitted <LocalDateTime iso={submission.submitted_at} />
              {submission.is_late ? <Badge variant="late" className="ml-1">Late</Badge> : null}
            </>
          ) : submission?.marks != null ? (
            "Marked without an upload"
          ) : (
            "Not submitted"
          )}
        </p>
        {submission?.marks != null ? (
          <Badge variant="success" className="mt-1">
            Marked
          </Badge>
        ) : null}
        {submission && submission.file_paths.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-2">
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
      </TableCell>
      <TableCell className="align-top">
        <Label htmlFor={`marks-${student.id}`} className="sr-only">
          Marks (of {totalMarks})
        </Label>
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
        <p className="mt-1 text-xs text-muted-foreground">of {totalMarks}</p>
      </TableCell>
      <TableCell className="align-top">
        <Label htmlFor={`feedback-${student.id}`} className="sr-only">
          Feedback
        </Label>
        <Textarea
          id={`feedback-${student.id}`}
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
          disabled={isPending}
          rows={2}
        />
      </TableCell>
      <TableCell className="align-top">
        <div className="flex items-center gap-2">
          <Switch
            id={`counts-${student.id}`}
            checked={countsTowardReport}
            onCheckedChange={setCountsTowardReport}
            disabled={isPending}
          />
          <Label htmlFor={`counts-${student.id}`} className="text-xs">
            Counts
          </Label>
        </div>
      </TableCell>
      <TableCell className="align-top text-right">
        <Button type="button" size="sm" onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving…" : "Save"}
        </Button>
        {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
        {saved && !error ? <p className="mt-1 text-xs text-muted-foreground">Saved.</p> : null}
      </TableCell>
    </TableRow>
  );
}
