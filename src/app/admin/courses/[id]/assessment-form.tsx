"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toDatetimeLocalValue, toUtcIso } from "@/lib/format-date";
import type { Tables } from "@/lib/supabase/database.types";
import { parseQuizText, quizQuestionsToText, quizTextProblem, type QuizQuestion } from "@/lib/quiz-format";
import { useIsClient } from "@/lib/use-is-client";
import { assessmentSchema } from "@/lib/validation/assessments";
import { createAssessment, updateAssessment, type AssessmentFormState } from "./assessment-actions";
import { AttachmentUploadField } from "./attachment-upload-field";
import { LockedQuizQuestions, QuizQuestionsField } from "./quiz-questions-field";

const initialState: AssessmentFormState = { error: null, success: false };

type Assessment = Tables<"assessments">;
type Batch = Pick<Tables<"batches">, "id" | "name">;

/** An existing quiz's saved questions, and whether students have submitted it (which locks them). */
export type QuizEditInfo = { questions: QuizQuestion[]; locked: boolean };

const TYPE_ITEMS = { assignment: "Assignment", test: "Test", quiz: "Quiz" } as const;

export function AssessmentForm(
  props:
    | { mode: "create"; courseId: string; batches: Batch[]; onDone: () => void }
    | {
        mode: "edit";
        courseId: string;
        assessment: Assessment;
        quiz: QuizEditInfo | null;
        batches: Batch[];
        onDone: () => void;
      },
) {
  const assessment = props.mode === "edit" ? props.assessment : undefined;
  const action =
    props.mode === "create"
      ? createAssessment.bind(null, props.courseId)
      : updateAssessment.bind(null, props.courseId, props.assessment.id);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [type, setType] = useState<string>(assessment?.type ?? "");
  const [batchId, setBatchId] = useState<string>(assessment?.batch_id ?? "");
  const [attachmentPath, setAttachmentPath] = useState<string | null>(assessment?.attachment_path ?? null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // A quiz stays a quiz and other types can't become one (the database
  // enforces this too), so editing only offers the types it can change to.
  const isQuiz = type === "quiz";
  const typeOptions: (keyof typeof TYPE_ITEMS)[] =
    props.mode === "create" ? ["assignment", "test", "quiz"] : isQuiz ? ["quiz"] : ["assignment", "test"];
  const quizInfo = props.mode === "edit" ? props.quiz : null;
  const quizLocked = quizInfo?.locked ?? false;
  const [quizText, setQuizText] = useState(() => (quizInfo ? quizQuestionsToText(quizInfo.questions) : ""));
  // Editing starts from the saved questions, which were already checked.
  const [previewedQuizText, setPreviewedQuizText] = useState<string | null>(() =>
    quizInfo ? quizQuestionsToText(quizInfo.questions) : null,
  );
  const quizReady = previewedQuizText === quizText && quizTextProblem(parseQuizText(quizText)) === null;

  // The local-time value depends on the viewer's time zone, which is only
  // known client-side — computing it during the initial render would use the
  // server's time zone instead and mismatch on hydration, so it stays blank
  // until useIsClient flips true. Once the admin edits the field directly,
  // their typed value always wins.
  const isClient = useIsClient();
  const [userEditedDueAt, setUserEditedDueAt] = useState<string | null>(null);
  const dueAtLocal =
    userEditedDueAt ?? (isClient && assessment ? toDatetimeLocalValue(assessment.due_at) : "");

  useEffect(() => {
    if (state.success) {
      toast.success("Saved");
      props.onDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const dueAtUtc = dueAtLocal ? toUtcIso(dueAtLocal) : "";
    formData.set("due_at", dueAtUtc);

    const map: Record<string, string> = {};
    let quizQuestionCount: number | null = null;
    if (isQuiz) {
      if (quizLocked) {
        quizQuestionCount = quizInfo?.questions.length ?? null;
      } else {
        const quiz = parseQuizText(quizText);
        quizQuestionCount = quiz.questions.length;
        const problem = quizTextProblem(quiz);
        if (problem) map.quiz_text = problem;
        else if (previewedQuizText !== quizText) map.quiz_text = "Press Preview and check the questions first.";
      }
    }

    const parsed = assessmentSchema.safeParse({
      type: formData.get("type"),
      title: formData.get("title"),
      instructions: formData.get("instructions"),
      due_at: formData.get("due_at"),
      total_marks: isQuiz ? quizQuestionCount : formData.get("total_marks"),
      batch_id: formData.get("batch_id"),
      attachment_path: isQuiz ? null : formData.get("attachment_path"),
    });

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".");
        if (!(key in map)) map[key] = issue.message;
      }
    }
    if (Object.keys(map).length > 0) {
      event.preventDefault();
      setFieldErrors(map);
      return;
    }
    setFieldErrors({});
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={handleSubmit}
      className="space-y-4"
      noValidate
    >
      <input type="hidden" name="due_at" value={dueAtLocal ? toUtcIso(dueAtLocal) : ""} readOnly />
      <input type="hidden" name="attachment_path" value={attachmentPath ?? ""} readOnly />

      <div className="space-y-2">
        <Label htmlFor="assessment-type">Type</Label>
        <Select
          name="type"
          items={Object.fromEntries(typeOptions.map((t) => [t, TYPE_ITEMS[t]]))}
          value={type || null}
          onValueChange={(value) => setType(value ?? "")}
        >
          <SelectTrigger id="assessment-type" className="w-full" aria-invalid={Boolean(fieldErrors.type)}>
            <SelectValue placeholder="Choose a type" />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map((t) => (
              <SelectItem key={t} value={t}>
                {TYPE_ITEMS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isQuiz && props.mode === "create" ? (
          <p className="text-xs text-muted-foreground">
            Multiple choice, answered on the page and marked automatically. A quiz can&apos;t be changed to
            another type later.
          </p>
        ) : null}
        {fieldErrors.type ? <FieldError>{fieldErrors.type}</FieldError> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="assessment-title">Title</Label>
        <Input
          id="assessment-title"
          name="title"
          defaultValue={assessment?.title ?? ""}
          aria-invalid={Boolean(fieldErrors.title)}
        />
        {fieldErrors.title ? <FieldError>{fieldErrors.title}</FieldError> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="assessment-instructions">Instructions</Label>
        <Textarea
          id="assessment-instructions"
          name="instructions"
          rows={5}
          defaultValue={assessment?.instructions ?? ""}
          aria-invalid={Boolean(fieldErrors.instructions)}
        />
        {fieldErrors.instructions ? <FieldError>{fieldErrors.instructions}</FieldError> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="assessment-due-at">Due date</Label>
          <Input
            id="assessment-due-at"
            type="datetime-local"
            value={dueAtLocal}
            onChange={(event) => setUserEditedDueAt(event.target.value)}
            aria-invalid={Boolean(fieldErrors.due_at)}
          />
          {fieldErrors.due_at ? <FieldError>{fieldErrors.due_at}</FieldError> : null}
        </div>

        {isQuiz ? null : (
        <div className="space-y-2">
          <Label htmlFor="assessment-total-marks">Total marks</Label>
          <Input
            id="assessment-total-marks"
            name="total_marks"
            type="number"
            min="0.1"
            step="0.1"
            defaultValue={assessment?.total_marks ?? ""}
            aria-invalid={Boolean(fieldErrors.total_marks)}
          />
          {fieldErrors.total_marks ? <FieldError>{fieldErrors.total_marks}</FieldError> : null}
        </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="assessment-batch">Target batch</Label>
        <Select
          name="batch_id"
          items={{ "": "Whole course", ...Object.fromEntries(props.batches.map((b) => [b.id, b.name])) }}
          value={batchId || ""}
          onValueChange={(value) => setBatchId(value ?? "")}
        >
          <SelectTrigger id="assessment-batch" className="w-full">
            <SelectValue placeholder="Whole course" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Whole course</SelectItem>
            {props.batches.map((batch) => (
              <SelectItem key={batch.id} value={batch.id}>
                {batch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {props.batches.length === 0
            ? "No batches have students in this course yet."
            : "Leave as “Whole course” to show this to everyone enrolled. Only batches with students in this course are listed."}
        </p>
      </div>

      {!isQuiz ? (
        <AttachmentUploadField courseId={props.courseId} value={attachmentPath} onChange={setAttachmentPath} />
      ) : quizLocked && quizInfo ? (
        <LockedQuizQuestions questions={quizInfo.questions} />
      ) : (
        <QuizQuestionsField
          value={quizText}
          onChange={setQuizText}
          previewedValue={previewedQuizText}
          onPreview={() => setPreviewedQuizText(quizText)}
          error={fieldErrors.quiz_text}
        />
      )}

      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => { props.onDone(); router.refresh(); }}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || (isQuiz && !quizLocked && !quizReady)}>
          {isPending
            ? "Saving…"
            : props.mode === "edit"
              ? "Save changes"
              : isQuiz
                ? "Publish quiz"
                : "Create assessment"}
        </Button>
      </div>
    </form>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-destructive">{children}</p>;
}
