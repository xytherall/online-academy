import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileTextIcon, LinkIcon } from "lucide-react";
import { LocalDateTime } from "@/components/local-date-time";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/admin/empty-state";
import { Separator } from "@/components/ui/separator";
import { computeAssessmentStatus } from "@/lib/assessments";
import { requireStudent } from "@/lib/auth";
import { assessmentStatusBadgeVariant } from "@/lib/status-badge";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Course" };

export default async function StudentCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireStudent();
  const supabase = await createClient();

  // Enrollment is checked explicitly rather than relying on the courses
  // table's own RLS: that policy also lets any authenticated student read a
  // *published* course they are not enrolled in (it backs the public site),
  // so a courses-only lookup would leak the course's existence here.
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("student_id", profile.id)
    .eq("course_id", id)
    .maybeSingle();

  if (!enrollment) notFound();

  const [
    { data: course, error: courseError },
    { data: resources, error: resourcesError },
    { data: assessments, error: assessmentsError },
    { data: submissions, error: submissionsError },
  ] = await Promise.all([
    supabase.from("courses").select("*").eq("id", id).maybeSingle(),
    supabase.from("resources").select("*").eq("course_id", id).order("sort_order", { ascending: true }),
    // RLS ("Students can read visible assessments") already restricts this to
    // course-wide/matching-batch assessments plus any the student already
    // has a submission for — no extra app-level filter is needed here.
    supabase.from("assessments").select("*").eq("course_id", id).order("due_at", { ascending: true }),
    supabase.from("submissions").select("*").eq("student_id", profile.id),
  ]);

  if (courseError) {
    return <p className="text-sm text-destructive">Could not load this course. Please refresh the page.</p>;
  }
  if (!course) notFound();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold">{course.title}</h1>
          <Badge variant="secondary">{course.level} Level</Badge>
        </div>
        {course.description ? (
          <p className="whitespace-pre-line text-sm text-muted-foreground">{course.description}</p>
        ) : null}
      </div>

      <Separator />

      <div className="space-y-4">
        <h2 className="font-medium">Resources</h2>

        {resourcesError ? (
          <Alert variant="destructive">
            <AlertDescription>Could not load resources. Please refresh the page.</AlertDescription>
          </Alert>
        ) : resources && resources.length > 0 ? (
          <ul className="space-y-2">
            {resources.map((resource) => (
              <li key={resource.id} className="rounded-lg border border-border bg-card p-3">
                <a
                  href={
                    resource.kind === "file" ? `/student/resources/${resource.id}` : (resource.url ?? "#")
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 font-medium hover:underline"
                >
                  {resource.kind === "file" ? (
                    <FileTextIcon className="size-4 shrink-0" />
                  ) : (
                    <LinkIcon className="size-4 shrink-0" />
                  )}
                  {resource.title}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No resources yet" description="Check back later." />
        )}
      </div>

      <Separator />

      <div className="space-y-4">
        <h2 className="font-medium">Assessments</h2>

        {assessmentsError || submissionsError ? (
          <Alert variant="destructive">
            <AlertDescription>Could not load assessments. Please refresh the page.</AlertDescription>
          </Alert>
        ) : assessments && assessments.length > 0 ? (
          <ul className="space-y-2">
            {assessments.map((assessment) => {
              const submission = submissions?.find((s) => s.assessment_id === assessment.id) ?? null;
              const status = computeAssessmentStatus(assessment, submission);
              return (
                <li key={assessment.id} className="rounded-lg border border-border bg-card p-3">
                  <Link
                    href={`/student/assessments/${assessment.id}`}
                    className="flex flex-wrap items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium hover:underline">{assessment.title}</p>
                        <Badge variant="secondary">
                          {assessment.type === "assignment" ? "Assignment" : "Test"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Due <LocalDateTime iso={assessment.due_at} /> · {assessment.total_marks} marks
                      </p>
                    </div>
                    <Badge variant={assessmentStatusBadgeVariant(status)}>{status}</Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="No assessments yet" description="Check back later." />
        )}
      </div>
    </div>
  );
}
