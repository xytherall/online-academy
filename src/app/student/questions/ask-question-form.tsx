"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SingleFilePicker } from "@/components/single-file-picker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { removeQuestionFile, uploadQuestionFile } from "@/lib/upload-question-file";
import { askQuestionSchema, GENERAL_COURSE_VALUE, MAX_QUESTION_LENGTH } from "@/lib/validation/questions";
import { askQuestion } from "./actions";

type Course = { id: string; title: string };

export function AskQuestionForm({ studentId, courses }: { studentId: string; courses: Course[] }) {
  const router = useRouter();
  const [courseId, setCourseId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const courseItems = {
    [GENERAL_COURSE_VALUE]: "General",
    ...Object.fromEntries(courses.map((course) => [course.id, course.title])),
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = askQuestionSchema.safeParse({ course_id: courseId ?? "", body, attachment_path: null });
    const errors: Record<string, string> = {};
    if (!courseId) errors.course_id = "Choose a course or General";
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".");
        if (!(key in errors)) errors[key] = issue.message;
      }
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsPending(true);
    let attachmentPath: string | null = null;
    try {
      if (file) {
        attachmentPath = await uploadQuestionFile(studentId, file);
        if (!attachmentPath) {
          setError("Could not upload your file. Please try again.");
          return;
        }
      }

      const result = await askQuestion({ course_id: courseId ?? "", body, attachment_path: attachmentPath });
      if (result.error) {
        setError(result.error);
        return;
      }

      toast.success("Question sent");
      setCourseId(null);
      setBody("");
      setFile(null);
      router.refresh();
    } catch {
      // A crashed compression/upload step must not leave a stray file or a stuck button.
      if (attachmentPath) await removeQuestionFile(attachmentPath);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-card p-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="question-course">Course</Label>
        <Select items={courseItems} value={courseId} onValueChange={(value) => setCourseId(value ?? null)}>
          <SelectTrigger id="question-course" className="w-full" aria-invalid={Boolean(fieldErrors.course_id)}>
            <SelectValue placeholder="Choose a course" />
          </SelectTrigger>
          <SelectContent>
            {courses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.title}
              </SelectItem>
            ))}
            <SelectItem value={GENERAL_COURSE_VALUE}>General</SelectItem>
          </SelectContent>
        </Select>
        {fieldErrors.course_id ? <p className="text-sm text-destructive">{fieldErrors.course_id}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="question-body">Your question</Label>
        <Textarea
          id="question-body"
          rows={5}
          maxLength={MAX_QUESTION_LENGTH}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          aria-invalid={Boolean(fieldErrors.body)}
        />
        {fieldErrors.body ? <p className="text-sm text-destructive">{fieldErrors.body}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="question-file">Photo or file</Label>
        <SingleFilePicker id="question-file" file={file} onChange={setFile} disabled={isPending} />
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Sending…" : "Send question"}
        </Button>
      </div>
    </form>
  );
}
