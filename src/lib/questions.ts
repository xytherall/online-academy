import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { Database, Tables } from "@/lib/supabase/database.types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type QuestionStatus = Database["public"]["Enums"]["question_status"];
export type Question = Tables<"questions">;

export type QuestionListItem = Pick<Question, "id" | "body" | "status" | "created_at" | "answered_at"> & {
  course: { title: string } | null;
};

/** The asking student's own questions, newest first (RLS: own rows only). */
export async function getStudentQuestions(
  supabase: SupabaseServerClient,
  studentId: string,
): Promise<{ questions: QuestionListItem[] | null; error: boolean }> {
  const { data, error } = await supabase
    .from("questions")
    .select("id, body, status, created_at, answered_at, course:courses(title)")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (error) return { questions: null, error: true };
  return { questions: data, error: false };
}

/**
 * One question with its course title. RLS returns nothing for another
 * student's question, so callers treat null as a 404.
 */
export async function getQuestion(
  supabase: SupabaseServerClient,
  questionId: string,
): Promise<(Question & { course: { title: string } | null }) | null> {
  const { data } = await supabase
    .from("questions")
    .select("*, course:courses(title)")
    .eq("id", questionId)
    .maybeSingle();
  return data;
}

/** Drives the admin "Questions" nav badge. */
export async function getWaitingQuestionCount(supabase: SupabaseServerClient): Promise<number> {
  const { count } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("status", "waiting");
  return count ?? 0;
}

/** `which` comes from the URL: "question" = the student's file, "answer" = the teacher's. */
export function questionFilePath(
  question: Pick<Question, "attachment_path" | "answer_attachment_path">,
  which: string,
): string | null {
  if (which === "question") return question.attachment_path;
  if (which === "answer") return question.answer_attachment_path;
  return null;
}
