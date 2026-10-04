"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SingleFilePicker } from "@/components/single-file-picker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { filenameFromPath } from "@/lib/storage-paths";
import { removeQuestionFile, uploadQuestionFile } from "@/lib/upload-question-file";
import { answerQuestionSchema, MAX_QUESTION_LENGTH } from "@/lib/validation/questions";
import { answerQuestion, closeQuestion } from "../actions";

type QuestionForAnswer = {
  id: string;
  student_id: string;
  status: "waiting" | "answered" | "closed";
  answer: string | null;
  answer_attachment_path: string | null;
};

export function AnswerForm({ question }: { question: QuestionForAnswer }) {
  const router = useRouter();
  const isEdit = question.status === "answered";
  const [answer, setAnswer] = useState(question.answer ?? "");
  const [keptPath, setKeptPath] = useState<string | null>(question.answer_attachment_path);
  const [file, setFile] = useState<File | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = answerQuestionSchema.safeParse({ answer, answer_attachment_path: null });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Write an answer");
      return;
    }
    setFieldError(null);

    setIsPending(true);
    let uploadedPath: string | null = null;
    try {
      if (file) {
        uploadedPath = await uploadQuestionFile(`${question.student_id}/answers`, file);
        if (!uploadedPath) {
          setError("Could not upload the file. Please try again.");
          return;
        }
      }

      const result = await answerQuestion(question.id, {
        answer,
        answer_attachment_path: uploadedPath ?? keptPath,
      });
      if (result.error) {
        setError(result.error);
        return;
      }

      toast.success(isEdit ? "Answer updated" : "Answer sent");
      setFile(null);
      router.refresh();
    } catch {
      if (uploadedPath) await removeQuestionFile(uploadedPath);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  async function handleClose() {
    setIsPending(true);
    const result = await closeQuestion(question.id);
    setIsPending(false);
    setCloseOpen(false);
    if (result.error) {
      toast.error(result.error);
      router.refresh();
      return;
    }
    toast.success("Question closed");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="answer-body">{isEdit ? "Edit answer" : "Your answer"}</Label>
        <Textarea
          id="answer-body"
          rows={6}
          maxLength={MAX_QUESTION_LENGTH}
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          aria-invalid={Boolean(fieldError)}
        />
        {fieldError ? <p className="text-sm text-destructive">{fieldError}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="answer-file">File</Label>
        {keptPath && !file ? (
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/admin/questions/${question.id}/files/answer`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              {filenameFromPath(keptPath)}
            </a>
            <Button type="button" variant="ghost" size="sm" onClick={() => setKeptPath(null)} disabled={isPending}>
              Remove
            </Button>
          </div>
        ) : (
          <SingleFilePicker id="answer-file" file={file} onChange={setFile} disabled={isPending} />
        )}
        {isEdit ? (
          <p className="text-xs text-muted-foreground">Editing an answer doesn&apos;t notify the student again.</p>
        ) : null}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        {question.status === "waiting" ? (
          <Button type="button" variant="outline" onClick={() => setCloseOpen(true)} disabled={isPending}>
            Close without answering
          </Button>
        ) : null}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : isEdit ? "Save answer" : "Send answer"}
        </Button>
      </div>

      <Dialog open={closeOpen} onOpenChange={(next) => !isPending && setCloseOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close without answering?</DialogTitle>
            <DialogDescription>
              The student will see this question as closed. They won&apos;t get a notification.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCloseOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="button" onClick={handleClose} disabled={isPending}>
              {isPending ? "Closing…" : "Close question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
