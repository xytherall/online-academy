"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { optionLetter } from "@/lib/quiz-format";
import { useIsClient } from "@/lib/use-is-client";
import { cn } from "@/lib/utils";
import { submitQuiz } from "./quiz-actions";

type Question = { question: string; options: string[] };
type Picks = (number | null)[];

function storageKey(assessmentId: string, studentId: string) {
  return `quiz-answers:${assessmentId}:${studentId}`;
}

/** Picks saved on this device before submitting, if they still fit the quiz. */
function readStoredPicks(key: string, questions: Question[]): Picks | null {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(key) ?? "null");
    if (!Array.isArray(value) || value.length !== questions.length) return null;
    return value.map((pick, index) =>
      Number.isInteger(pick) && pick >= 0 && pick < questions[index].options.length ? (pick as number) : null,
    );
  } catch {
    // Storage blocked (e.g. private mode) or unreadable: start with no picks.
    return null;
  }
}

/**
 * All questions on one page, one option each. Picks are kept in this
 * device's storage until submitted, so leaving the page doesn't lose them.
 * Submitting is final, so it asks for confirmation first.
 */
export function QuizForm({
  assessmentId,
  studentId,
  questions,
}: {
  assessmentId: string;
  studentId: string;
  questions: Question[];
}) {
  const router = useRouter();
  const key = storageKey(assessmentId, studentId);
  const isClient = useIsClient();
  // null until the student picks something; until then any stored picks are shown.
  const [userPicks, setUserPicks] = useState<Picks | null>(null);
  const picks: Picks =
    userPicks ?? (isClient ? readStoredPicks(key, questions) : null) ?? questions.map(() => null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const answeredCount = picks.filter((pick) => pick !== null).length;
  const allAnswered = answeredCount === questions.length;

  function pick(questionIndex: number, optionIndex: number) {
    const next = picks.map((value, index) => (index === questionIndex ? optionIndex : value));
    setUserPicks(next);
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Storage blocked: the picks still work on this page, they just aren't kept.
    }
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await submitQuiz(assessmentId, picks.map((value) => value ?? -1));
      if (result.error) {
        setError(result.error);
        setConfirmOpen(false);
        toast.error(result.error);
        return;
      }
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Nothing to clean up if storage is blocked.
      }
      setConfirmOpen(false);
      toast.success("Quiz submitted");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <ol className="space-y-3">
        {questions.map((q, questionIndex) => (
          <li key={questionIndex}>
            <fieldset className="rounded-lg border border-border bg-card p-3">
              <legend className="sr-only">Question {questionIndex + 1}</legend>
              <p className="text-sm font-medium whitespace-pre-line">
                <span className="text-muted-foreground">{questionIndex + 1}. </span>
                {q.question}
              </p>
              <div className="mt-2 space-y-1.5">
                {q.options.map((option, optionIndex) => {
                  const checked = picks[questionIndex] === optionIndex;
                  return (
                    <label
                      key={optionIndex}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 text-sm transition-colors",
                        checked ? "border-primary bg-primary-soft" : "border-border hover:bg-muted",
                        isPending && "cursor-not-allowed opacity-70",
                      )}
                    >
                      <input
                        type="radio"
                        name={`question-${questionIndex}`}
                        value={optionIndex}
                        checked={checked}
                        onChange={() => pick(questionIndex, optionIndex)}
                        disabled={isPending}
                        className="mt-0.5 size-4 shrink-0 accent-primary"
                      />
                      <span className="w-5 shrink-0 font-medium">{optionLetter(optionIndex)})</span>
                      <span className="min-w-0 flex-1 break-words">{option}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </li>
        ))}
      </ol>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {answeredCount} of {questions.length} answered
        </p>
        <Button type="button" onClick={() => setConfirmOpen(true)} disabled={!allAnswered || isPending}>
          Submit quiz
        </Button>
      </div>
      {!allAnswered ? (
        <p className="text-right text-xs text-muted-foreground">Answer every question to submit.</p>
      ) : null}

      <Dialog open={confirmOpen} onOpenChange={(next) => !isPending && setConfirmOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit your answers?</DialogTitle>
            <DialogDescription>You can&apos;t change answers after this.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)} disabled={isPending}>
              Keep checking
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Submitting…" : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
