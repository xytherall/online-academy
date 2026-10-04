import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { QuestionThread } from "@/components/question-thread";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { displayName } from "@/lib/display-name";
import { getQuestion } from "@/lib/questions";
import { questionStatusBadge } from "@/lib/status-badge";
import { createClient } from "@/lib/supabase/server";
import { AnswerForm } from "./answer-form";

export const metadata: Metadata = { title: "Question" };

export default async function AdminQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const question = await getQuestion(supabase, id);
  if (!question) notFound();

  const { data: student } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", question.student_id)
    .maybeSingle();

  const badge = questionStatusBadge(question.status);
  const studentName = student ? displayName(student) : "Student";

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/admin/questions"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
      >
        <ArrowLeftIcon className="size-4" aria-hidden />
        All questions
      </Link>

      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold">{question.course?.title ?? "General"}</h1>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
        {student ? (
          <Link href={`/admin/students/${student.id}`} className="text-sm text-muted-foreground hover:underline">
            {studentName}
          </Link>
        ) : null}
      </div>

      <QuestionThread
        question={question}
        filesHref={`/admin/questions/${question.id}/files`}
        askedBy={studentName}
      />

      <Separator />

      <AnswerForm
        key={question.updated_at}
        question={{
          id: question.id,
          student_id: question.student_id,
          status: question.status,
          answer: question.answer,
          answer_attachment_path: question.answer_attachment_path,
        }}
      />
    </div>
  );
}
