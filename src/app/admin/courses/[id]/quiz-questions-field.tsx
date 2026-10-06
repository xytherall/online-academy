"use client";

import { useMemo } from "react";
import { CopyButton } from "@/components/copy-button";
import { QuizQuestionCard, QuizQuestionList } from "@/components/quiz-question-list";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CHATGPT_QUIZ_PROMPT, parseQuizText, type QuizQuestion } from "@/lib/quiz-format";

const PLACEHOLDER = `Q: What is the SI unit of force?
A) Joule
B) Newton
C) Watt
D) Pascal
Answer: B

Q: …`;

/**
 * The quiz's questions on the assessment form: one paste box, a Preview that
 * shows every question with its correct answer in green and every block it
 * can't read in red with the reason. The form only publishes once the
 * current text has been previewed with nothing unreadable.
 */
export function QuizQuestionsField({
  value,
  onChange,
  previewedValue,
  onPreview,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  /** The text as it was when Preview was last pressed; null if never. */
  previewedValue: string | null;
  onPreview: () => void;
  error?: string;
}) {
  const isPreviewCurrent = previewedValue !== null && previewedValue === value;
  const parsed = useMemo(() => (isPreviewCurrent ? parseQuizText(value) : null), [isPreviewCurrent, value]);

  // Readable blocks are numbered 1, 2, 3…; unreadable ones get no number.
  const numbers = parsed?.blocks.reduce<number[]>(
    (acc, block) => [...acc, (acc.at(-1) ?? 0) + (block.ok ? 1 : 0)],
    [],
  );

  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3">
        <CopyButton value={CHATGPT_QUIZ_PROMPT} label="Copy ChatGPT prompt" />
        <p className="text-xs text-muted-foreground">
          Paste this into ChatGPT, replace [WRITE HERE] with your topic, then paste ChatGPT&apos;s reply below.
        </p>
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">Show the prompt</summary>
          <pre className="mt-2 whitespace-pre-wrap rounded-md bg-background p-2 font-mono">{CHATGPT_QUIZ_PROMPT}</pre>
        </details>
      </div>

      <div className="space-y-2">
        <Label htmlFor="quiz-text">Questions</Label>
        <Textarea
          id="quiz-text"
          name="quiz_text"
          rows={14}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={PLACEHOLDER}
          className="font-mono text-sm"
          aria-invalid={Boolean(error)}
          aria-describedby="quiz-text-help"
        />
        <p id="quiz-text-help" className="text-xs text-muted-foreground">
          One question per block, with a blank line between questions: a <strong>Q:</strong> line, 2 to 6 options{" "}
          <strong>A)</strong> <strong>B)</strong> …, then <strong>Answer:</strong> and the letter. Each question is
          worth 1 mark.
        </p>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={onPreview} disabled={value.trim() === ""}>
        Preview
      </Button>

      {parsed ? (
        <div className="space-y-3" aria-live="polite">
          {parsed.errorCount > 0 ? (
            <Alert variant="destructive">
              <AlertDescription>
                {parsed.questions.length} ready,{" "}
                {parsed.errorCount === 1 ? "1 block can't be read" : `${parsed.errorCount} blocks can't be read`}{" "}
                (shown in red). Fix them in the box above and press Preview again.
              </AlertDescription>
            </Alert>
          ) : parsed.questions.length > 0 ? (
            <p className="text-sm font-medium">
              {parsed.questions.length === 1 ? "1 question" : `${parsed.questions.length} questions`} ready. Check
              the answers in green, then publish.
            </p>
          ) : null}

          <ol className="space-y-3">
            {parsed.blocks.map((block, index) => {
              if (block.ok) {
                return (
                  <li key={index}>
                    <QuizQuestionCard number={numbers?.[index] ?? index + 1} {...toView(block.question)} />
                  </li>
                );
              }
              return (
                <li key={index} className="rounded-lg border border-destructive bg-destructive/10 p-3">
                  <p className="text-sm font-medium text-destructive">Can&apos;t read this: {block.reason}</p>
                  <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs text-foreground">
                    {block.text}
                  </pre>
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

/** Read-only questions for a quiz students have already submitted. */
export function LockedQuizQuestions({ questions }: { questions: QuizQuestion[] }) {
  return (
    <div className="space-y-2">
      <Label>Questions</Label>
      <p className="text-sm text-muted-foreground">
        Students have already submitted this quiz, so its questions can&apos;t be changed. You can still change
        the title, instructions, batch and due date.
      </p>
      <QuizQuestionList questions={questions.map(toView)} />
    </div>
  );
}

function toView(question: QuizQuestion) {
  return { question: question.question, options: question.options, correctIndex: question.correctIndex };
}
