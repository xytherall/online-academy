import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export async function getBatchName(batchId: string | null): Promise<string | null> {
  if (!batchId) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("batches").select("name").eq("id", batchId).maybeSingle();
  return data?.name ?? null;
}

export type DueSoonAssessment = {
  id: string;
  title: string;
  type: Database["public"]["Enums"]["assessment_type"];
  due_at: string;
  course: { id: string; title: string } | null;
};

/**
 * Everything still ahead of the student (SPEC §7 dashboard), with no upper
 * date limit: every visible, unsubmitted assignment or quiz (overdue ones
 * included, since both can still be handed in late) plus every test whose
 * date hasn't passed. A past test is over rather than overdue and is left
 * out. Any submission row, including admin-entered marks, takes an item off
 * the list.
 */
export async function getDueSoonAssessments(
  studentId: string,
  batchId: string | null,
): Promise<{ assessments: DueSoonAssessment[] | null; error: boolean }> {
  const supabase = await createClient();

  const { data: enrollments, error: enrollmentsError } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("student_id", studentId);
  if (enrollmentsError) return { assessments: null, error: true };

  const courseIds = enrollments.map((row) => row.course_id);
  if (courseIds.length === 0) return { assessments: [], error: false };

  const { data: submissions, error: submissionsError } = await supabase
    .from("submissions")
    .select("assessment_id")
    .eq("student_id", studentId);
  if (submissionsError) return { assessments: null, error: true };
  const submittedIds = new Set(submissions.map((row) => row.assessment_id));

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("assessments")
    .select("id, title, type, due_at, batch_id, course:courses(id, title)")
    .in("course_id", courseIds)
    .or(`type.in.(assignment,quiz),due_at.gte.${now}`)
    .order("due_at", { ascending: true });

  if (error) return { assessments: null, error: true };

  const assessments = data
    .filter((a) => !submittedIds.has(a.id) && (a.batch_id === null || a.batch_id === batchId))
    .map(({ id, title, type, due_at, course }) => ({ id, title, type, due_at, course }));

  return { assessments, error: false };
}

export type RecentlyMarkedSubmission = {
  id: string;
  marks: number | null;
  marked_at: string | null;
  assessment: { id: string; title: string; total_marks: number; course: { id: string; title: string } | null } | null;
};

/** Last 5 marked submissions/tests for this student, newest first. */
export async function getRecentlyMarked(
  studentId: string,
): Promise<{ submissions: RecentlyMarkedSubmission[] | null; error: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("submissions")
    .select("id, marks, marked_at, assessment:assessments(id, title, total_marks, course:courses(id, title))")
    .eq("student_id", studentId)
    .not("marks", "is", null)
    .order("marked_at", { ascending: false })
    .limit(5);

  if (error) return { submissions: null, error: true };
  return { submissions: data, error: false };
}
