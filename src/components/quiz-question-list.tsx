import { CheckIcon, XIcon } from "lucide-react";
import { optionLetter } from "@/lib/quiz-format";
import { cn } from "@/lib/utils";

export type QuizQuestionView = {
  question: string;
  options: string[];
  /** Highlighted green when set. */
  correctIndex?: number | null;
  /** The student's pick: marked red when it isn't the correct one. */
  chosenIndex?: number | null;
};

/**
 * Read-only list of quiz questions, shared by the admin preview, the admin's
 * view of a student's answers and the student's result. The correct option
 * is only ever passed in where the viewer is allowed to see it.
 */
export function QuizQuestionList({
  questions,
  startNumber = 1,
  chosenLabel,
}: {
  questions: QuizQuestionView[];
  startNumber?: number;
  /** Shown next to the picked option, e.g. "Student's answer" for the admin. */
  chosenLabel?: string;
}) {
  return (
    <ol className="space-y-3">
      {questions.map((q, index) => (
        <li key={index}>
          <QuizQuestionCard number={startNumber + index} chosenLabel={chosenLabel} {...q} />
        </li>
      ))}
    </ol>
  );
}

export function QuizQuestionCard({
  number,
  question,
  options,
  correctIndex = null,
  chosenIndex = null,
  chosenLabel = "Your answer",
}: QuizQuestionView & { number: number; chosenLabel?: string }) {
  const answered = chosenIndex !== null && correctIndex !== null;
  const isRight = answered && chosenIndex === correctIndex;

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium whitespace-pre-line">
          <span className="text-muted-foreground">{number}. </span>
          {question}
        </p>
        {answered ? (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              isRight ? "bg-success-bg text-success" : "bg-late-bg text-late",
            )}
          >
            {isRight ? <CheckIcon className="size-3" aria-hidden /> : <XIcon className="size-3" aria-hidden />}
            {isRight ? "Correct" : "Wrong"}
          </span>
        ) : null}
      </div>
      <ul className="mt-2 space-y-1">
        {options.map((option, index) => {
          const isCorrect = index === correctIndex;
          const isWrongPick = index === chosenIndex && !isCorrect;
          return (
            <li
              key={index}
              className={cn(
                "flex items-start gap-2 rounded-md px-2 py-1 text-sm",
                isCorrect && "bg-success-bg font-medium text-success",
                isWrongPick && "bg-late-bg text-late",
              )}
            >
              <span className="w-5 shrink-0 font-medium">{optionLetter(index)})</span>
              <span className="min-w-0 flex-1 break-words">{option}</span>
              {isCorrect ? <CheckIcon className="mt-0.5 size-4 shrink-0" aria-label="Correct answer" /> : null}
              {index === chosenIndex ? <span className="shrink-0 text-xs font-normal">{chosenLabel}</span> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
