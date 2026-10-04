import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircleQuestionMarkIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { LocalDateTime } from "@/components/local-date-time";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { requireStudent } from "@/lib/auth";
import { getStudentQuestions } from "@/lib/questions";
import { questionStatusBadge } from "@/lib/status-badge";
import { createClient } from "@/lib/supabase/server";
import { AskQuestionForm } from "./ask-question-form";

export const metadata: Metadata = { title: "Ask the teacher" };

export default async function StudentQuestionsPage() {
  const profile = await requireStudent();
  const supabase = await createClient();

  const [{ questions, error }, { data: enrollments, error: coursesError }] = await Promise.all([
    getStudentQuestions(supabase, profile.id),
    supabase.from("enrollments").select("course:courses(id, title)").eq("student_id", profile.id),
  ]);

  const courses = (enrollments ?? [])
    .flatMap((enrollment) => (enrollment.course ? [enrollment.course] : []))
    .sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div className="max-w-2xl space-y-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Ask the teacher</h1>
        <p className="text-sm text-muted-foreground">
          Stuck on something? Ask here and you&apos;ll get an answer on this page. Only you and the academy can see
          your questions.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-medium">Ask a question</h2>
        {coursesError ? (
          <Alert variant="destructive">
            <AlertDescription>Could not load your courses. Please refresh the page.</AlertDescription>
          </Alert>
        ) : (
          <AskQuestionForm studentId={profile.id} courses={courses} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Your questions</h2>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>Could not load your questions. Please refresh the page.</AlertDescription>
          </Alert>
        ) : questions && questions.length > 0 ? (
          <ul className="space-y-2">
            {questions.map((question) => {
              const badge = questionStatusBadge(question.status);
              return (
                <li key={question.id}>
                  <Link
                    href={`/student/questions/${question.id}`}
                    className="block space-y-1 rounded-lg border border-border bg-card p-3 hover:bg-accent/50"
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{question.course?.title ?? "General"}</span>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </span>
                    <span className="line-clamp-2 block text-sm break-words text-muted-foreground">
                      {question.body}
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
            compact
            icon={MessageCircleQuestionMarkIcon}
            title="No questions yet"
            description="Questions you ask will show up here with the teacher's answer."
          />
        )}
      </section>
    </div>
  );
}
