"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { notifyMarks } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";
import { buildSaveMarksSchema } from "@/lib/validation/submissions";

export type SaveMarksResult = { error: string | null };

// P0001 is a plain RAISE EXCEPTION from the submissions_check_marks trigger;
// its message is already the friendly, user-facing text (see the Stage 6A
// migration and the identical pattern in assessment-actions.ts).
function friendlyDbError(error: { code?: string; message: string }, fallback: string): string {
  if (error.code === "P0001") return error.message;
  return fallback;
}

export async function saveMarks(
  assessmentId: string,
  studentId: string,
  input: { marks: string; feedback: string; counts_toward_report: boolean },
): Promise<SaveMarksResult> {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const { data: assessment } = await supabase
    .from("assessments")
    .select("total_marks")
    .eq("id", assessmentId)
    .maybeSingle();

  if (!assessment) return { error: "Assessment not found." };

  const parsed = buildSaveMarksSchema(assessment.total_marks).safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the values and try again." };
  }

  const { marks, feedback, counts_toward_report } = parsed.data;

  if (marks === null) {
    // A feedback/counts-only save with no marks must never create a
    // submission row — that would permanently block the student from
    // submitting (no resubmission, SPEC §15). Only an existing row can be
    // updated here, and doing so clears marks/marked_by/marked_at.
    const { data: existing } = await supabase
      .from("submissions")
      .select("id")
      .eq("assessment_id", assessmentId)
      .eq("student_id", studentId)
      .maybeSingle();

    if (!existing) {
      return { error: "Enter marks to save a record for this student." };
    }

    const { error } = await supabase
      .from("submissions")
      .update({ marks: null, feedback, counts_toward_report, marked_by: null, marked_at: null })
      .eq("id", existing.id);

    if (error) return { error: friendlyDbError(error, "Could not save. Please try again.") };
  } else {
    const { data: previous } = await supabase
      .from("submissions")
      .select("marks, feedback")
      .eq("assessment_id", assessmentId)
      .eq("student_id", studentId)
      .maybeSingle();

    const { error } = await supabase.from("submissions").upsert(
      {
        assessment_id: assessmentId,
        student_id: studentId,
        marks,
        feedback,
        counts_toward_report,
        marked_by: admin.id,
        marked_at: new Date().toISOString(),
      },
      { onConflict: "assessment_id,student_id" },
    );

    if (error) return { error: friendlyDbError(error, "Could not save. Please try again.") };

    // Notify the student only when their marks or feedback actually changed,
    // so re-saving the same values doesn't ping them again.
    if (!previous || previous.marks !== marks || previous.feedback !== feedback) {
      await notifyMarks(supabase, assessmentId, studentId);
    }
  }

  revalidatePath(`/admin/assessments/${assessmentId}`);
  revalidatePath("/admin/marking");
  revalidatePath("/admin");
  return { error: null };
}
