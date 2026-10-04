import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircleQuestionMarkIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { LocalDateTime } from "@/components/local-date-time";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { displayName } from "@/lib/display-name";
import { questionStatusBadge } from "@/lib/status-badge";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Questions" };

export default async function AdminQuestionsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("questions")
    .select(
      "id, body, status, created_at, course:courses(title), student:profiles!questions_student_id_fkey(full_name, email)",
    )
    .order("created_at", { ascending: false });

  // Waiting questions first, longest-waiting at the top; then everything else, newest first.
  const waiting = (data ?? []).filter((q) => q.status === "waiting").reverse();
  const others = (data ?? []).filter((q) => q.status !== "waiting");
  const questions = [...waiting, ...others];

  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Questions</h1>
        <p className="text-sm text-muted-foreground">
          Questions students asked through &ldquo;Ask the teacher&rdquo;. {waiting.length} waiting for an answer.
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>Could not load questions. Please refresh the page.</AlertDescription>
        </Alert>
      ) : questions.length > 0 ? (
        <ul className="space-y-2">
          {questions.map((question) => {
            const badge = questionStatusBadge(question.status);
            return (
              <li key={question.id}>
                <Link
                  href={`/admin/questions/${question.id}`}
                  className="block space-y-1 rounded-lg border border-border bg-card p-3 hover:bg-accent/50"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">
                      {question.student ? displayName(question.student) : "Unknown student"}
                    </span>
                    <span className="text-sm text-muted-foreground">· {question.course?.title ?? "General"}</span>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {question.body.split("\n")[0]}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Asked <LocalDateTime iso={question.created_at} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          icon={MessageCircleQuestionMarkIcon}
          title="No questions yet"
          description="When a student asks a question from their portal, it will show up here."
        />
      )}
    </div>
  );
}
