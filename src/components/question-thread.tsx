import { PaperclipIcon } from "lucide-react";
import { LocalDateTime } from "@/components/local-date-time";
import { filenameFromPath } from "@/lib/storage-paths";
import type { Tables } from "@/lib/supabase/database.types";

type QuestionForThread = Pick<
  Tables<"questions">,
  "body" | "attachment_path" | "status" | "answer" | "answer_attachment_path" | "answered_at" | "created_at"
>;

/**
 * The question and (if any) its answer, shared by the student and admin
 * detail pages. Files open through `filesHref`/question|answer, a route
 * handler that checks access and redirects to a short-lived signed URL.
 */
export function QuestionThread({
  question,
  filesHref,
  askedBy,
}: {
  question: QuestionForThread;
  filesHref: string;
  askedBy?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">
          {askedBy ? `${askedBy} asked ` : "Asked "}
          <LocalDateTime iso={question.created_at} />
        </p>
        <p className="text-sm break-words whitespace-pre-wrap">{question.body}</p>
        {question.attachment_path ? (
          <FileLink href={`${filesHref}/question`} path={question.attachment_path} />
        ) : null}
      </div>

      {question.answer ? (
        <div className="space-y-2 rounded-lg border border-primary/40 bg-primary-soft/40 p-4">
          <p className="text-xs text-muted-foreground">
            Teacher&apos;s answer
            {question.answered_at ? (
              <>
                {" · "}
                <LocalDateTime iso={question.answered_at} />
              </>
            ) : null}
          </p>
          <p className="text-sm break-words whitespace-pre-wrap">{question.answer}</p>
          {question.answer_attachment_path ? (
            <FileLink href={`${filesHref}/answer`} path={question.answer_attachment_path} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function FileLink({ href, path }: { href: string; path: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
    >
      <PaperclipIcon className="size-4" aria-hidden />
      {filenameFromPath(path)}
    </a>
  );
}
