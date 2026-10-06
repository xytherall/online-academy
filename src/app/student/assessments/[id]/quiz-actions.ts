"use server";

import { revalidatePath } from "next/cache";
import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { submitQuizSchema } from "@/lib/validation/quizzes";

/**
 * Submits the student's picks. Scoring, the one-attempt rule, visibility and
 * the late flag are all decided inside submit_quiz() in the database; only
 * the picks are sent, never a score.
 */
export async function submitQuiz(assessmentId: string, answers: number[]): Promise<{ error: string | null }> {
  await requireStudent();

  const parsed = submitQuizSchema.safeParse({ assessmentId, answers });
  if (!parsed.success) return { error: "Answer every question before submitting." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_quiz", {
    p_assessment_id: parsed.data.assessmentId,
    p_answers: parsed.data.answers,
  });

  // P0001 is a RAISE EXCEPTION in submit_quiz(); its message is written for students.
  if (error) return { error: error.code === "P0001" ? error.message : "Could not submit. Please try again." };

  revalidatePath(`/student/assessments/${parsed.data.assessmentId}`);
  revalidatePath("/student");
  return { error: null };
}
