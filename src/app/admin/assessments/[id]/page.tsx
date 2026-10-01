import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { LocalDateTime } from "@/components/local-date-time";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { displayName } from "@/lib/display-name";
import type { Tables } from "@/lib/supabase/database.types";
import { MarkingTable } from "./marking-table";

type RosterStudent = { id: string; full_name: string | null; email: string };

export const metadata: Metadata = { title: "Marking" };

export default async function AdminAssessmentMarkingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();
  const supabase = await createClient();

  const { data: assessment } = await supabase.from("assessments").select("*").eq("id", id).maybeSingle();
  if (!assessment) notFound();

  const [{ data: course }, { data: enrollmentRows }, { data: submissions }] = await Promise.all([
    supabase.from("courses").select("id, title").eq("id", assessment.course_id).maybeSingle(),
    supabase
      .from("enrollments")
      .select("student:profiles(id, full_name, email, batch_id)")
      .eq("course_id", assessment.course_id),
    supabase
      .from("submissions")
      .select("*, student:profiles!submissions_student_id_fkey(id, full_name, email)")
      .eq("assessment_id", id),
  ]);

  // Every student the assessment applies to: enrolled + batch rule, plus
  // anyone with an existing submission regardless of current
  // enrollment/batch (mirrors the Stage 6A student visibility rule).
  const roster = new Map<string, RosterStudent>();
  for (const row of enrollmentRows ?? []) {
    const student = row.student;
    if (!student) continue;
    if (assessment.batch_id === null || student.batch_id === assessment.batch_id) {
      roster.set(student.id, { id: student.id, full_name: student.full_name, email: student.email });
    }
  }
  for (const submission of submissions ?? []) {
    const student = submission.student;
    if (student && !roster.has(student.id)) {
      roster.set(student.id, { id: student.id, full_name: student.full_name, email: student.email });
    }
  }

  const submissionByStudent = new Map<string, Tables<"submissions">>(
    (submissions ?? []).map((s) => [s.student_id, s]),
  );

  const entries = Array.from(roster.values())
    .sort((a, b) => displayName(a).localeCompare(displayName(b)))
    .map((student) => ({ student, submission: submissionByStudent.get(student.id) ?? null }));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        {course ? (
          <Link href={`/admin/courses/${course.id}`} className="text-sm text-muted-foreground hover:underline">
            {course.title}
          </Link>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold">{assessment.title}</h1>
          <Badge variant="secondary">{assessment.type === "assignment" ? "Assignment" : "Test"}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Due <LocalDateTime iso={assessment.due_at} /> · {assessment.total_marks} marks
        </p>
      </div>

      <MarkingTable assessmentId={assessment.id} totalMarks={assessment.total_marks} entries={entries} />
    </div>
  );
}
