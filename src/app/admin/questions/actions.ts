"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { notifyAnswer } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";
import { answerQuestionSchema, type AnswerQuestionInput } from "@/lib/validation/questions";

type ActionResult = { error: string | null };

const questionIdSchema = z.uuid();

function revalidateQuestion(questionId: string) {
  revalidatePath("/admin", "layout");
  revalidatePath(`/admin/questions/${questionId}`);
  revalidatePath("/student/questions");
  revalidatePath(`/student/questions/${questionId}`);
}

/**
 * Sends (or edits) the one answer to a question. The first answer notifies
 * the student; editing an existing answer doesn't (owner decision). The
 * attachment, if any, was already uploaded into `{student_id}/answers/`.
 */
export async function answerQuestion(questionId: string, input: AnswerQuestionInput): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsedId = questionIdSchema.safeParse(questionId);
  if (!parsedId.success) return { error: "Question not found." };

  const parsed = answerQuestionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the answer and try again." };
  }

  const supabase = await createClient();
  const { data: question } = await supabase
    .from("questions")
    .select("id, student_id, status, answered_at, answer_attachment_path")
    .eq("id", parsedId.data)
    .maybeSingle();

  if (!question) return { error: "This question no longer exists. The student may have deleted it." };

  const { answer, answer_attachment_path } = parsed.data;
  if (answer_attachment_path && !answer_attachment_path.startsWith(`${question.student_id}/answers/`)) {
    return { error: "Invalid file. Please try again." };
  }

  const isFirstAnswer = question.status !== "answered";
  const { data: updated, error } = await supabase
    .from("questions")
    .update({
      status: "answered",
      answer,
      answer_attachment_path,
      answered_by: admin.id,
      // Keep the original time when only editing the answer.
      answered_at: isFirstAnswer ? new Date().toISOString() : question.answered_at,
    })
    .eq("id", question.id)
    .select("id");

  if (error || !updated || updated.length === 0) {
    if (answer_attachment_path && answer_attachment_path !== question.answer_attachment_path) {
      await supabase.storage.from("questions").remove([answer_attachment_path]);
    }
    return { error: "Could not save the answer. Please try again." };
  }

  // The previous answer file was replaced or removed.
  if (question.answer_attachment_path && question.answer_attachment_path !== answer_attachment_path) {
    const { error: removeError } = await supabase.storage
      .from("questions")
      .remove([question.answer_attachment_path]);
    if (removeError) console.error("Could not remove an old answer file:", removeError.message);
  }

  if (isFirstAnswer) await notifyAnswer(supabase, question.id);

  revalidateQuestion(question.id);
  return { error: null };
}

/** Closes a waiting question without answering it. */
export async function closeQuestion(questionId: string): Promise<ActionResult> {
  await requireAdmin();

  const parsedId = questionIdSchema.safeParse(questionId);
  if (!parsedId.success) return { error: "Question not found." };

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("questions")
    .update({ status: "closed" })
    .eq("id", parsedId.data)
    .eq("status", "waiting")
    .select("id");

  if (error) return { error: "Could not close the question. Please try again." };
  if (!updated || updated.length === 0) {
    return { error: "Only a waiting question can be closed. It may have been answered or deleted." };
  }

  revalidateQuestion(parsedId.data);
  return { error: null };
}
