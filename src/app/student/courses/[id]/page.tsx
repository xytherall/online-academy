import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClipboardListIcon, FileTextIcon, LinkIcon, PlayCircleIcon } from "lucide-react";
import { LectureThumbnail } from "@/components/lecture-thumbnail";
import { LocalDateTime } from "@/components/local-date-time";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { SubjectIcon } from "@/components/subject-icon";
import { PortalListItem, PortalSection } from "@/components/portal/portal-list";
import { computeAssessmentStatus } from "@/lib/assessments";
import { requireStudent } from "@/lib/auth";
import { assessmentStatusBadgeVariant } from "@/lib/status-badge";
import { createClient } from "@/lib/supabase/server";
import { assessmentTypeLabel } from "@/lib/assessment-type";
import { formatDuration } from "@/lib/vimeo";

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
    { data: lectures, error: lecturesError },
    { data: resources, error: resourcesError },
    { data: assessments, error: assessmentsError },
    { data: submissions, error: submissionsError },
  ] = await Promise.all([
    supabase.from("courses").select("*").eq("id", id).maybeSingle(),
    // RLS only returns lectures the admin has shown to students.
    supabase
      .from("lectures")
      .select("id, title, duration_seconds, thumbnail_url")
      .eq("course_id", id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
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
    <div className="mx-auto w-full max-w-4xl space-y-10">
      <div className="rounded-3xl border border-border bg-card p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <SubjectIcon title={course.title} />
          <Badge variant="secondary">{course.level} Level</Badge>
        </div>
        <h1 className="mt-3 font-heading text-2xl font-bold tracking-[-0.02em] sm:text-3xl">{course.title}</h1>
        {course.description ? (
          <p className="mt-2 leading-relaxed whitespace-pre-line text-muted-foreground">{course.description}</p>
        ) : null}
      </div>

      <PortalSection title="Assignments and tests">
        {assessmentsError || submissionsError ? (
          <Alert variant="destructive">
            <AlertDescription>Could not load assessments. Please refresh the page.</AlertDescription>
          </Alert>
        ) : assessments && assessments.length > 0 ? (
          <ul className="space-y-2.5">
            {assessments.map((assessment) => {
              const submission = submissions?.find((s) => s.assessment_id === assessment.id) ?? null;
              const status = computeAssessmentStatus(assessment, submission);
              return (
                <li key={assessment.id}>
                  <PortalListItem
                    href={`/student/assessments/${assessment.id}`}
                    title={assessment.title}
                    details={[
                      `${assessmentTypeLabel(assessment.type)} · ${assessment.total_marks} marks`,
                      <>
                        Due <LocalDateTime iso={assessment.due_at} />
                      </>,
                    ]}
                    aside={<Badge variant={assessmentStatusBadgeVariant(status)}>{status}</Badge>}
                  />
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            compact
            icon={ClipboardListIcon}
            title="No assessments yet"
            description="Your teacher hasn't posted any assignments or tests for this course yet."
          />
        )}
      </PortalSection>

      <PortalSection title="Recorded lectures">
        {lecturesError ? (
          <Alert variant="destructive">
            <AlertDescription>Could not load recorded lectures. Please refresh the page.</AlertDescription>
          </Alert>
        ) : lectures && lectures.length > 0 ? (
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {lectures.map((lecture) => (
              <li key={lecture.id}>
                <PortalListItem
                  href={`/student/lectures/${lecture.id}`}
                  icon={<LectureThumbnail url={lecture.thumbnail_url} className="w-24" />}
                  title={<span className="line-clamp-2">{lecture.title}</span>}
                  details={[formatDuration(lecture.duration_seconds)]}
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            compact
            icon={PlayCircleIcon}
            title="No recorded lectures yet"
            description="Your teacher hasn't added any recorded lectures for this course yet."
          />
        )}
      </PortalSection>

      <PortalSection title="Notes and resources">
        {resourcesError ? (
          <Alert variant="destructive">
            <AlertDescription>Could not load resources. Please refresh the page.</AlertDescription>
          </Alert>
        ) : resources && resources.length > 0 ? (
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {resources.map((resource) => (
              <li key={resource.id}>
                <PortalListItem
                  href={resource.kind === "file" ? `/student/resources/${resource.id}` : (resource.url ?? "#")}
                  external
                  icon={
                    <span aria-hidden className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
                      {resource.kind === "file" ? <FileTextIcon className="size-4" /> : <LinkIcon className="size-4" />}
                    </span>
                  }
                  title={resource.title}
                  details={[resource.kind === "file" ? "File" : "Link"]}
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            compact
            icon={FileTextIcon}
            title="No resources yet"
            description="Your teacher hasn't added any notes or files for this course yet."
          />
        )}
      </PortalSection>
    </div>
  );
}