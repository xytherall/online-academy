"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStudent } from "@/lib/auth";
import { pushAdminAlerts } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";
import { askQuestionSchema, type AskQuestionInput } from "@/lib/validation/questions";

type ActionResult = { error: string | null };

/**
 * Saves a new question. The attachment (if any) was already uploaded by the
 * browser into the student's own folder; RLS re-checks that the course is
 * one they're enrolled in, and status/answer fields can't be set at all
 * (column-level insert grant).
 */
export async function askQuestion(input: AskQuestionInput): Promise<ActionResult & { id?: string }> {
  const profile = await requireStudent();

  const parsed = askQuestionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const { course_id, body, attachment_path } = parsed.data;
  const supabase = await createClient();

  if (attachment_path && !isOwnTopLevelPath(attachment_path, profile.id)) {
    return { error: "Invalid file. Please try again." };
  }

  const { data, error } = await supabase
    .from("questions")
    .insert({ student_id: profile.id, course_id, body, attachment_path })
    .select("id")
    .single();

  if (error) {
    if (attachment_path) await supabase.storage.from("questions").remove([attachment_path]);
    return { error: "Could not send your question. Please try again." };
  }

  pushAdminAlerts({ questionId: data.id });

  revalidatePath("/student/questions");
  revalidatePath("/admin", "layout");
  return { error: null, id: data.id };
}

/** A student may delete their own question only while it's still waiting (RLS enforces this too). */
export async function deleteQuestion(questionId: string): Promise<ActionResult> {
  const profile = await requireStudent();

  const parsed = z.uuid().safeParse(questionId);
  if (!parsed.success) return { error: "Question not found." };

  const supabase = await createClient();
  const { data: deleted, error } = await supabase
    .from("questions")
    .delete()
    .eq("id", parsed.data)
    .eq("student_id", profile.id)
    .eq("status", "waiting")
    .select("attachment_path");

  if (error) return { error: "Could not delete the question. Please try again." };
  if (!deleted || deleted.length === 0) {
    return { error: "This question has already been answered or closed, so it can't be deleted." };
  }

  const attachmentPath = deleted[0].attachment_path;
  if (attachmentPath) {
    const { error: removeError } = await supabase.storage.from("questions").remove([attachmentPath]);
    if (removeError) console.error("Could not remove a deleted question's file:", removeError.message);
  }

  revalidatePath("/student/questions");
  revalidatePath("/admin", "layout");
  return { error: null };
}

function isOwnTopLevelPath(path: string, studentId: string): boolean {
  const prefix = `${studentId}/`;
  return path.startsWith(prefix) && !path.slice(prefix.length).includes("/");
}
