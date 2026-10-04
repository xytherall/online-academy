import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { QuestionThread } from "@/components/question-thread";
import { Badge } from "@/components/ui/badge";
import { requireStudent } from "@/lib/auth";
import { getQuestion } from "@/lib/questions";
import { questionStatusBadge } from "@/lib/status-badge";
import { createClient } from "@/lib/supabase/server";
import { DeleteQuestionButton } from "./delete-question-button";

export const metadata: Metadata = { title: "Question" };

export default async function StudentQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireStudent();
  const supabase = await createClient();

  const question = await getQuestion(supabase, id);
  // RLS already hides other students' questions; the id check is a second guard.
  if (!question || question.student_id !== profile.id) notFound();

  const badge = questionStatusBadge(question.status);

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/student/questions"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
      >
        <ArrowLeftIcon className="size-4" aria-hidden />
        All questions
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold">{question.course?.title ?? "General"}</h1>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>

      <QuestionThread question={question} filesHref={`/student/questions/${question.id}/files`} />

      {question.status === "waiting" ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">The teacher hasn&apos;t answered yet.</p>
          <DeleteQuestionButton questionId={question.id} />
        </div>
      ) : null}
      {question.status === "closed" ? (
        <p className="text-sm text-muted-foreground">
          This question was closed without an answer. Ask again if you still need help.
        </p>
      ) : null}
    </div>
  );
}
