"use client";

import { useState, useTransition } from "react";
import { FileTextIcon } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { LocalDateTime } from "@/components/local-date-time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

  const toMark = entries.filter((e) => e.submission?.submitted_at && e.submission.marks == null).length;
  const marked = entries.filter((e) => e.submission?.marks != null).length;
  const notSubmitted = entries.length - toMark - marked;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-sm">
        <Badge variant="warning">{toMark} to mark</Badge>
        <Badge variant="success">{marked} marked</Badge>
        <Badge variant="secondary">{notSubmitted} not handed in</Badge>
      </div>
      <ul className="space-y-3">
        {entries.map((entry) => (
          <MarkingCard
            key={entry.student.id}
            assessmentId={assessmentId}
            totalMarks={totalMarks}
            quizQuestions={quizQuestions}
            {...entry}
          />
        ))}
      </ul>
    </div>
  );
}

function MarkingCard({
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

  const isMarked = submission?.marks != null;

  return (
    <li className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{displayName(student)}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            {submission?.submitted_at ? (
              <>
                Handed in <LocalDateTime iso={submission.submitted_at} />
                {submission.is_late ? <Badge variant="late">Late</Badge> : null}
              </>
            ) : isMarked ? (
              "Marked without an upload"
            ) : (
              "Not handed in"
            )}
          </p>
        </div>
        {isMarked ? (
          <Badge variant="success">
            {submission?.quiz_answers && !submission.marked_by ? "Marked automatically" : "Marked"}
          </Badge>
        ) : submission?.submitted_at ? (
          <Badge variant="warning">To mark</Badge>
        ) : null}
      </div>

      {(submission && submission.file_paths.length > 0) || (quizQuestions && submission?.quiz_answers) ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {submission?.file_paths.map((_, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              render={
                <a href={`/admin/submissions/${submission.id}/files/${index}`} target="_blank" rel="noopener noreferrer" />
              }
              nativeButton={false}
            >
              <FileTextIcon aria-hidden className="size-4" />
              Open file {submission.file_paths.length > 1 ? index + 1 : ""}
            </Button>
          ))}
          {quizQuestions && submission?.quiz_answers ? (
            <QuizAnswersDialog
              studentName={displayName(student)}
              questions={quizQuestions}
              answers={submission.quiz_answers}
            />
          ) : null}
        </div>
      ) : submission?.files_cleared_at ? (
        <p className="mt-3 text-sm text-muted-foreground">Files removed to free up space</p>
      ) : null}

      <div className="mt-4 grid gap-4 sm:grid-cols-[9rem_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor={`marks-${student.id}`}>Marks</Label>
          <div className="flex items-center gap-2">
            <Input
              id={`marks-${student.id}`}
              type="number"
              inputMode="decimal"
              min={0}
              max={totalMarks}
              step={0.1}
              value={marks}
              onChange={(event) => setMarks(event.target.value)}
              disabled={isPending}
            />
            <span className="shrink-0 text-sm text-muted-foreground">/ {totalMarks}</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`feedback-${student.id}`}>Feedback for the student</Label>
          <Textarea
            id={`feedback-${student.id}`}
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            disabled={isPending}
            rows={2}
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <div className="flex items-center gap-2">
          <Switch
            id={`counts-${student.id}`}
            checked={countsTowardReport}
            onCheckedChange={setCountsTowardReport}
            disabled={isPending}
          />
          <Label htmlFor={`counts-${student.id}`} className="font-normal">
            Count this in the progress report
          </Label>
        </div>
        <Button type="button" onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving…" : "Save marks"}
        </Button>
      </div>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </li>
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
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
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
