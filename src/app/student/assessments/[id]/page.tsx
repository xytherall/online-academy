import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, DownloadIcon, FileTextIcon } from "lucide-react";
import { LocalDateTime } from "@/components/local-date-time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PortalPanel } from "@/components/portal/portal-list";
import { getVisibleAssessmentForStudent, computeAssessmentStatus } from "@/lib/assessments";
import { requireStudent } from "@/lib/auth";
import { assessmentStatusBadgeVariant } from "@/lib/status-badge";
import { createClient } from "@/lib/supabase/server";
import { assessmentTypeLabel } from "@/lib/assessment-type";
import { QuizSection } from "./quiz-section";
import { SubmissionUploadForm } from "./submission-upload-form";

export const metadata: Metadata = { title: "Assessment" };

export default async function StudentAssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireStudent();
  const supabase = await createClient();

  const assessment = await getVisibleAssessmentForStudent(supabase, profile.id, id);
  if (!assessment) notFound();

  const [{ data: course }, { data: submission }] = await Promise.all([
    supabase.from("courses").select("id, title").eq("id", assessment.course_id).maybeSingle(),
    supabase
      .from("submissions")
      .select("*")
      .eq("assessment_id", assessment.id)
      .eq("student_id", profile.id)
      .maybeSingle(),
  ]);

  const status = computeAssessmentStatus(assessment, submission ?? null);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      {course ? (
        <Link
          href={`/student/courses/${course.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon aria-hidden className="size-4" />
          {course.title}
        </Link>
      ) : null}

      <div className="rounded-3xl border border-border bg-card p-5 sm:p-7">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{assessmentTypeLabel(assessment.type)}</Badge>
          <Badge variant={assessmentStatusBadgeVariant(status)}>{status}</Badge>
        </div>
        <h1 className="mt-3 font-heading text-2xl font-bold tracking-[-0.02em] sm:text-3xl">{assessment.title}</h1>
        <dl className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-muted px-4 py-3">
            <dt className="text-xs font-medium text-muted-foreground">Due</dt>
            <dd className="mt-0.5 text-sm font-semibold">
              <LocalDateTime iso={assessment.due_at} />
            </dd>
          </div>
          <div className="rounded-2xl bg-muted px-4 py-3">
            <dt className="text-xs font-medium text-muted-foreground">Total marks</dt>
            <dd className="mt-0.5 text-sm font-semibold">{assessment.total_marks}</dd>
          </div>
        </dl>
      </div>

      <PortalPanel title="What to do">
        <p className="leading-relaxed whitespace-pre-line">{assessment.instructions}</p>
        {assessment.attachment_path ? (
          <Button
            variant="outline"
            className="mt-4"
            render={
              <a href={`/student/assessment-attachments/${assessment.id}`} target="_blank" rel="noopener noreferrer" />
            }
            nativeButton={false}
          >
            <DownloadIcon aria-hidden className="size-4" />
            Open the attached file
          </Button>
        ) : null}
      </PortalPanel>

      {assessment.type === "quiz" ? (
        <QuizSection
          assessmentId={assessment.id}
          studentId={profile.id}
          dueAt={assessment.due_at}
          submission={submission ?? null}
        />
      ) : null}

      {!submission && assessment.type !== "quiz" ? (
        <PortalPanel title="Submit your work" description="Add a PDF or photos of your work, then press Submit.">
          <SubmissionUploadForm assessmentId={assessment.id} studentId={profile.id} dueAt={assessment.due_at} />
        </PortalPanel>
      ) : null}

      {/* A quiz the student answered shows its marks in the result instead. */}
      {submission?.marks != null && !submission.quiz_answers ? (
        <PortalPanel title="Your marks">
          <p className="font-display text-4xl font-extrabold tracking-[-0.03em] tabular-nums">
            {submission.marks}
            <span className="text-xl font-semibold text-muted-foreground"> / {assessment.total_marks}</span>
          </p>
          {submission.feedback ? (
            <div className="mt-4 rounded-2xl bg-muted px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground">Teacher&apos;s feedback</p>
              <p className="mt-1 leading-relaxed whitespace-pre-line">{submission.feedback}</p>
            </div>
          ) : null}
        </PortalPanel>
      ) : null}

      {submission?.submitted_at && assessment.type !== "quiz" ? (
        <PortalPanel title="Your submission">
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            Sent <LocalDateTime iso={submission.submitted_at} />
            {submission.is_late ? <Badge variant="late">Late</Badge> : null}
          </p>
          {submission.file_paths.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {submission.file_paths.map((_, index) => (
                <li key={index}>
                  <a
                    href={`/student/submissions/${submission.id}/files/${index}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-accent/40"
                  >
                    <span aria-hidden className="grid size-9 place-items-center rounded-lg bg-primary-soft text-primary">
                      <FileTextIcon className="size-4" />
                    </span>
                    File {index + 1}
                    <span className="ml-auto text-xs text-muted-foreground">Open</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : submission.files_cleared_at ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Your files were removed after marking to free up space. Your marks and feedback are kept.
            </p>
          ) : null}
        </PortalPanel>
      ) : null}
    </div>
  );
}
