import { createClient } from "@/lib/supabase/server";

export async function getBatchName(batchId: string | null): Promise<string | null> {
  if (!batchId) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("batches").select("name").eq("id", batchId).maybeSingle();
  return data?.name ?? null;
}

export type DueSoonAssessment = {
  id: string;
  title: string;
  due_at: string;
  course: { id: string; title: string } | null;
};

/**
 * Visible, unsubmitted assignments due in the next 7 days, plus overdue
 * ones — a `due_at` in the past already satisfies "within the next 7 days"
 * too, so a single upper-bound filter covers both (SPEC §7 dashboard).
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

  const cutoff = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("assessments")
    .select("id, title, due_at, batch_id, course:courses(id, title)")
    .eq("type", "assignment")
    .in("course_id", courseIds)
    .lte("due_at", cutoff)
    .order("due_at", { ascending: true });

  if (error) return { assessments: null, error: true };

  const assessments = data
    .filter((a) => !submittedIds.has(a.id) && (a.batch_id === null || a.batch_id === batchId))
    .map(({ id, title, due_at, course }) => ({ id, title, due_at, course }));

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
