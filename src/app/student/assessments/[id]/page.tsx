import Link from "next/link";
import { notFound } from "next/navigation";
import { FileTextIcon } from "lucide-react";
import { LocalDateTime } from "@/components/local-date-time";
import { Badge } from "@/components/ui/badge";
import { getVisibleAssessmentForStudent, computeAssessmentStatus } from "@/lib/assessments";
import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SubmissionUploadForm } from "./submission-upload-form";

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
          <Badge variant="secondary">{assessment.type === "assignment" ? "Assignment" : "Test"}</Badge>
          <Badge variant={status === "Missing" ? "destructive" : "outline"}>{status}</Badge>
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

      {assessment.type === "assignment" && !submission ? (
        <div className="space-y-2">
          <h2 className="font-medium">Submit your work</h2>
          <SubmissionUploadForm assessmentId={assessment.id} studentId={profile.id} dueAt={assessment.due_at} />
        </div>
      ) : null}

      {assessment.type === "assignment" && submission?.submitted_at ? (
        <div className="space-y-2 rounded-lg border border-border p-3">
          <h2 className="font-medium">Your submission</h2>
          <p className="text-sm">
            Submitted <LocalDateTime iso={submission.submitted_at} />
            {submission.is_late ? " · Late" : ""}
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
        </div>
      ) : null}

      {submission?.marks != null ? (
        <div className="space-y-2 rounded-lg border border-border p-3">
          <h2 className="font-medium">Marks</h2>
          <p className="text-sm">
            {submission.marks} / {assessment.total_marks}
          </p>
          {submission.feedback ? (
            <p className="whitespace-pre-line text-sm text-muted-foreground">{submission.feedback}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
