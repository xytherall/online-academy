import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileTextIcon } from "lucide-react";
import { LocalDateTime } from "@/components/local-date-time";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getVisibleAssessmentForStudent, computeAssessmentStatus } from "@/lib/assessments";
import { requireStudent } from "@/lib/auth";
import { assessmentStatusBadgeVariant } from "@/lib/status-badge";
import { createClient } from "@/lib/supabase/server";
import { SubmissionUploadForm } from "./submission-upload-form";
import { assessmentTypeLabel } from "@/lib/assessment-type";

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
    <div className="max-w-2xl space-y-6">
      <div className="space-y-2">
        {course ? (
          <Link href={`/student/courses/${course.id}`} className="text-sm text-muted-foreground hover:underline">
            {course.title}
          </Link>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold">{assessment.title}</h1>
          <Badge variant="secondary">{assessmentTypeLabel(assessment.type)}</Badge>
          <Badge variant={assessmentStatusBadgeVariant(status)}>{status}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Due <LocalDateTime iso={assessment.due_at} /> · {assessment.total_marks} marks
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="font-medium">Instructions</h2>
        <p className="whitespace-pre-line text-sm">{assessment.instructions}</p>
      </div>

      {assessment.attachment_path ? (
        <div className="space-y-2">
          <h2 className="font-medium">Attachment</h2>
          <a
            href={`/student/assessment-attachments/${assessment.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 font-medium hover:underline"
          >
            <FileTextIcon className="size-4 shrink-0" />
            Download attachment
          </a>
        </div>
      ) : null}

      {!submission ? (
        <div className="space-y-2">
          <h2 className="font-medium">Submit your work</h2>
          <SubmissionUploadForm assessmentId={assessment.id} studentId={profile.id} dueAt={assessment.due_at} />
        </div>
      ) : null}

      {submission?.submitted_at ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your submission</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="flex flex-wrap items-center gap-2 text-sm">
              Submitted <LocalDateTime iso={submission.submitted_at} />
              {submission.is_late ? <Badge variant="late">Late</Badge> : null}
            </p>
            {submission.file_paths.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {submission.file_paths.map((_, index) => (
                  <li key={index}>
                    <a
                      href={`/student/submissions/${submission.id}/files/${index}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 font-medium hover:underline"
                    >
                      <FileTextIcon className="size-4 shrink-0" />
                      File {index + 1}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {submission?.marks != null ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Marks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm font-medium">
              {submission.marks} / {assessment.total_marks}
            </p>
            {submission.feedback ? (
              <p className="whitespace-pre-line text-sm text-muted-foreground">{submission.feedback}</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
