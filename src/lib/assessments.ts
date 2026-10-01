import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

type Assessment = Tables<"assessments">;
type Submission = Tables<"submissions">;

export type AssessmentStatus =
  | "Not submitted"
  | "Submitted"
  | "Submitted late"
  | "Marked"
  | "Missing"
  | "Not yet marked";

/**
 * SPEC §7 assessment statuses shown to students. "Marked" is decided by
 * `marks` being non-null (not `marked_at`), consistently everywhere marking
 * state is shown — a saved mark is what makes something "marked".
 *
 * Marks take precedence over everything else (owner decision, SPEC §15):
 * work an admin marks without an upload (e.g. sent over WhatsApp) is
 * "Marked", never "Missing", regardless of `submitted_at`. "Missing" is
 * reached only for an assignment that is past due with neither a
 * submission nor marks. This is the single place this precedence lives —
 * every page that shows a status, a "Missing" count, or the homework
 * summary goes through this function (directly or via
 * `computeCourseReport`), so they can never disagree.
 */
export function computeAssessmentStatus(
  assessment: Pick<Assessment, "type" | "due_at">,
  submission: Pick<Submission, "submitted_at" | "is_late" | "marks"> | null,
  now: Date = new Date(),
): AssessmentStatus {
  if (submission?.marks != null) return "Marked";

  if (assessment.type === "test") return "Not yet marked";

  if (!submission || !submission.submitted_at) {
    return new Date(assessment.due_at) < now ? "Missing" : "Not submitted";
  }

  return submission.is_late ? "Submitted late" : "Submitted";
}

/**
 * Server-side mirror of the "Students can read visible assessments" RLS
 * policy, used so pages can 404 explicitly instead of relying on RLS alone
 * (same reasoning as the enrollment check on /student/courses/[id] and the
 * resource signed-URL route in Stage 5).
 */
export async function getVisibleAssessmentForStudent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string,
  assessmentId: string,
): Promise<Assessment | null> {
  const { data: assessment } = await supabase
    .from("assessments")
    .select("*")
    .eq("id", assessmentId)
    .maybeSingle();

  if (!assessment) return null;

  const { data: submission } = await supabase
    .from("submissions")
    .select("id")
    .eq("assessment_id", assessmentId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (submission) return assessment;

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("student_id", studentId)
    .eq("course_id", assessment.course_id)
    .maybeSingle();

  if (!enrollment) return null;

  if (assessment.batch_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("batch_id")
      .eq("id", studentId)
      .maybeSingle();
    if (profile?.batch_id !== assessment.batch_id) return null;
  }

  return assessment;
}
