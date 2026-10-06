"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { LocalDateTime } from "@/components/local-date-time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { QuizQuestionList } from "@/components/quiz-question-list";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { displayName } from "@/lib/display-name";
import type { QuizQuestion } from "@/lib/quiz-format";
import type { Tables } from "@/lib/supabase/database.types";
import { saveMarks } from "./actions";

type Submission = Tables<"submissions">;
type Student = { id: string; full_name: string | null; email: string };

export function MarkingTable({
  assessmentId,
  totalMarks,
  entries,
  quizQuestions = null,
}: {
  assessmentId: string;
  totalMarks: number;
  entries: { student: Student; submission: Submission | null }[];
  /** Set for a quiz, so each student's answers can be viewed. */
  quizQuestions?: QuizQuestion[] | null;
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
            <MarkingRow
              key={entry.student.id}
              assessmentId={assessmentId}
              totalMarks={totalMarks}
              quizQuestions={quizQuestions}
              {...entry}
            />
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
  quizQuestions,
}: {
  assessmentId: string;
  totalMarks: number;
  student: Student;
  submission: Submission | null;
  quizQuestions: QuizQuestion[] | null;
}) {
  const [marks, setMarks] = useState(submission?.marks != null ? String(submission.marks) : "");
  const [feedback, setFeedback] = useState(submission?.feedback ?? "");
  const [countsTowardReport, setCountsTowardReport] = useState(submission?.counts_toward_report ?? true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await saveMarks(assessmentId, student.id, {
        marks,
        feedback,
        counts_toward_report: countsTowardReport,
      });
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success("Saved");
    });
  }

  return (
    <TableRow>
      <TableCell className="align-top">
        <p className="font-medium">{displayName(student)}</p>
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
            {submission.quiz_answers && !submission.marked_by ? "Marked automatically" : "Marked"}
          </Badge>
        ) : null}
        {quizQuestions && submission?.quiz_answers ? (
          <QuizAnswersDialog
            studentName={displayName(student)}
            questions={quizQuestions}
            answers={submission.quiz_answers}
          />
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
        ) : submission?.files_cleared_at ? (
          <p className="mt-1 text-xs text-muted-foreground">Files removed to free up space</p>
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
      </TableCell>
    </TableRow>
  );
}

function QuizAnswersDialog({
  studentName,
  questions,
  answers,
}: {
  studentName: string;
  questions: QuizQuestion[];
  answers: number[];
}) {
  const correct = questions.filter((q, index) => answers[index] === q.correctIndex).length;

  return (
    <Dialog>
      <DialogTrigger render={<Button type="button" variant="link" size="sm" className="mt-1 h-auto px-0" />}>
        View answers
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{studentName}&apos;s answers</DialogTitle>
          <DialogDescription>
            {correct} of {questions.length} correct. Correct answers are in green.
          </DialogDescription>
        </DialogHeader>
        <QuizQuestionList
          chosenLabel="Student's answer"
          questions={questions.map((q, index) => ({
            question: q.question,
            options: q.options,
            correctIndex: q.correctIndex,
            chosenIndex: answers[index] ?? null,
          }))}
        />
      </DialogContent>
    </Dialog>
  );
}
