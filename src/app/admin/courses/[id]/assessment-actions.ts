"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { notifyNewAssessment } from "@/lib/notifications";
import { parseQuizText, quizTextProblem, type QuizQuestion } from "@/lib/quiz-format";
import { createClient } from "@/lib/supabase/server";
import { assessmentSchema } from "@/lib/validation/assessments";

export type AssessmentFormState = { error: string | null; success: boolean };
export type AssessmentActionResult = { error: string | null };

/**
 * A quiz has no attachment and its total marks is its question count
 * (1 mark each), so neither is taken from the form for a quiz.
 */
function parseAssessmentForm(formData: FormData, quizQuestionCount: number | null) {
  const isQuiz = formData.get("type") === "quiz";
  return assessmentSchema.safeParse({
    type: formData.get("type"),
    title: formData.get("title"),
    instructions: formData.get("instructions"),
    due_at: formData.get("due_at"),
    total_marks: isQuiz ? quizQuestionCount : formData.get("total_marks"),
    batch_id: formData.get("batch_id"),
    attachment_path: isQuiz ? null : formData.get("attachment_path"),
  });
}

/** Re-parses the pasted questions on the server; the client's preview is never trusted. */
function parseQuizForm(formData: FormData): { questions: QuizQuestion[]; error: string | null } {
  const text = formData.get("quiz_text");
  const parsed = parseQuizText(typeof text === "string" ? text : "");
  return { questions: parsed.questions, error: quizTextProblem(parsed) };
}

function saveQuizQuestions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  assessmentId: string,
  questions: QuizQuestion[],
) {
  return supabase.rpc("save_quiz_questions", {
    p_assessment_id: assessmentId,
    p_questions: questions.map((q) => ({
      question: q.question,
      options: q.options,
      correct_index: q.correctIndex,
    })),
  });
}

// P0001 is a plain RAISE EXCEPTION from one of the cross-table triggers in
// the Stage 6A migration (total_marks floor, marks-out-of-range); its
// message is already the friendly, user-facing text we wrote there.
function friendlyDbError(error: { code?: string; message: string }, fallback: string): string {
  if (error.code === "P0001") return error.message;
  return fallback;
}

async function cleanupUploadedAttachment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  attachmentPath: string | null,
) {
  if (attachmentPath) {
    await supabase.storage.from("course-files").remove([attachmentPath]);
  }
}

const BATCH_NOT_IN_COURSE = "That batch has no students in this course. Choose another batch or Whole course.";

/**
 * Batches aren't tied to a course (SPEC §2): a batch can be targeted only if
 * at least one of its students is enrolled in this course, otherwise the
 * assessment would reach nobody. Mirrors the course page's batch list.
 */
async function batchHasStudentsInCourse(
  supabase: Awaited<ReturnType<typeof createClient>>,
  courseId: string,
  batchId: string,
): Promise<boolean> {
  const { count, error } = await supabase
    .from("enrollments")
    .select("id, student:profiles!inner(batch_id)", { count: "exact", head: true })
    .eq("course_id", courseId)
    .eq("student.batch_id", batchId);
  return !error && (count ?? 0) > 0;
}

export async function createAssessment(
  courseId: string,
  _prevState: AssessmentFormState,
  formData: FormData,
): Promise<AssessmentFormState> {
  await requireAdmin();

  const quiz = formData.get("type") === "quiz" ? parseQuizForm(formData) : null;
  if (quiz?.error) return { error: quiz.error, success: false };

  const parsed = parseAssessmentForm(formData, quiz ? quiz.questions.length : null);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Please check the form and try again.",
      success: false,
    };
  }

  const supabase = await createClient();

  if (parsed.data.batch_id && !(await batchHasStudentsInCourse(supabase, courseId, parsed.data.batch_id))) {
    await cleanupUploadedAttachment(supabase, parsed.data.attachment_path);
    return { error: BATCH_NOT_IN_COURSE, success: false };
  }

  const { data: created, error } = await supabase
    .from("assessments")
    .insert({
      course_id: courseId,
      batch_id: parsed.data.batch_id,
      type: parsed.data.type,
      title: parsed.data.title,
      instructions: parsed.data.instructions,
      attachment_path: parsed.data.attachment_path,
      due_at: parsed.data.due_at,
      total_marks: parsed.data.total_marks,
    })
    .select("id")
    .single();

  if (error) {
    // The attachment (if any) already made it into storage; clean it up so a
    // failed insert doesn't leave an orphaned object behind.
    await cleanupUploadedAttachment(supabase, parsed.data.attachment_path);
    return {
      error: friendlyDbError(error, "Could not create the assessment. Please try again."),
      success: false,
    };
  }

  if (quiz) {
    const { error: questionsError } = await saveQuizQuestions(supabase, created.id, quiz.questions);
    if (questionsError) {
      // Nobody has been notified yet and nobody can have submitted, so the
      // half-made quiz is simply removed.
      await supabase.from("assessments").delete().eq("id", created.id);
      return {
        error: friendlyDbError(questionsError, "Could not save the questions. Please try again."),
        success: false,
      };
    }
  }

  await notifyNewAssessment(supabase, created.id);

  revalidatePath(`/admin/courses/${courseId}`);
  return { error: null, success: true };
}

export async function updateAssessment(
  courseId: string,
  assessmentId: string,
  _prevState: AssessmentFormState,
  formData: FormData,
): Promise<AssessmentFormState> {
  await requireAdmin();

  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from("assessments")
    .select("type, due_at, attachment_path, total_marks, batch_id")
    .eq("id", assessmentId)
    .eq("course_id", courseId)
    .maybeSingle();

  const submittedType = formData.get("type");
  const isQuiz = existing?.type === "quiz";

  if (fetchError || !existing || isQuiz !== (submittedType === "quiz")) {
    const uploaded = formData.get("attachment_path");
    if (typeof uploaded === "string" && uploaded && uploaded !== existing?.attachment_path) {
      await cleanupUploadedAttachment(supabase, uploaded);
    }
    return {
      error: !existing ? "Assessment not found." : "A quiz can't be changed to another type, or another type to a quiz.",
      success: false,
    };
  }

  // Questions are locked once anyone has a submission (the database enforces
  // this too); title, instructions, batch and due date stay editable.
  let quizQuestions: QuizQuestion[] | null = null;
  if (isQuiz) {
    const { count, error: countError } = await supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("assessment_id", assessmentId);
    if (countError) return { error: "Could not save the assessment. Please try again.", success: false };

    if (!count) {
      const quiz = parseQuizForm(formData);
      if (quiz.error) return { error: quiz.error, success: false };
      quizQuestions = quiz.questions;
    }
  }

  const parsed = parseAssessmentForm(
    formData,
    isQuiz ? (quizQuestions?.length ?? existing.total_marks) : null,
  );
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Please check the form and try again.",
      success: false,
    };
  }

  // The batch it already targets may stay even if it no longer has students
  // in this course; only a newly chosen batch is checked.
  if (
    parsed.data.batch_id &&
    parsed.data.batch_id !== existing.batch_id &&
    !(await batchHasStudentsInCourse(supabase, courseId, parsed.data.batch_id))
  ) {
    if (parsed.data.attachment_path && parsed.data.attachment_path !== existing.attachment_path) {
      await cleanupUploadedAttachment(supabase, parsed.data.attachment_path);
    }
    return { error: BATCH_NOT_IN_COURSE, success: false };
  }

  if (quizQuestions) {
    const { error: questionsError } = await saveQuizQuestions(supabase, assessmentId, quizQuestions);
    if (questionsError) {
      return {
        error: friendlyDbError(questionsError, "Could not save the questions. Please try again."),
        success: false,
      };
    }
  }

  const { error } = await supabase
    .from("assessments")
    .update({
      batch_id: parsed.data.batch_id,
      type: parsed.data.type,
      title: parsed.data.title,
      instructions: parsed.data.instructions,
      attachment_path: parsed.data.attachment_path,
      due_at: parsed.data.due_at,
      total_marks: parsed.data.total_marks,
    })
    .eq("id", assessmentId);

  if (error) {
    // Only clean up a *newly uploaded* replacement — never the still-in-use
    // existing attachment.
    if (parsed.data.attachment_path && parsed.data.attachment_path !== existing.attachment_path) {
      await cleanupUploadedAttachment(supabase, parsed.data.attachment_path);
    }
    return {
      error: friendlyDbError(error, "Could not save the assessment. Please try again."),
      success: false,
    };
  }

  // The old attachment is only deleted once the new metadata is confirmed
  // written, so a failed update never leaves the row pointing at a removed file.
  if (existing.attachment_path && existing.attachment_path !== parsed.data.attachment_path) {
    await supabase.storage.from("course-files").remove([existing.attachment_path]);
  }

  // due_at changing recomputes is_late / the default counts_toward_report for
  // unmarked submissions only (owner decision, Stage 6) — marked ones keep
  // the admin's existing choice. No submissions exist yet in 6A, so this is
  // a no-op today but needs no rework once 6B starts creating them.
  if (existing.due_at !== parsed.data.due_at) {
    // A quiz is scored automatically on submit (marked_at set, marked_by
    // null), so its submissions are re-flagged too unless an admin has
    // since entered a mark themselves.
    let unmarkedQuery = supabase
      .from("submissions")
      .select("id, submitted_at")
      .eq("assessment_id", assessmentId)
      .not("submitted_at", "is", null);
    unmarkedQuery = isQuiz ? unmarkedQuery.is("marked_by", null) : unmarkedQuery.is("marked_at", null);
    const { data: unmarkedSubmissions } = await unmarkedQuery;

    const newDueAt = new Date(parsed.data.due_at);
    for (const submission of unmarkedSubmissions ?? []) {
      const isLate = new Date(submission.submitted_at as string) > newDueAt;
      await supabase
        .from("submissions")
        .update({ is_late: isLate, counts_toward_report: !isLate })
        .eq("id", submission.id);
    }
  }

  revalidatePath(`/admin/courses/${courseId}`);
  return { error: null, success: true };
}

export async function deleteAssessment(
  courseId: string,
  assessmentId: string,
): Promise<AssessmentActionResult> {
  await requireAdmin();

  const supabase = await createClient();

  const { data: assessment, error: fetchError } = await supabase
    .from("assessments")
    .select("attachment_path")
    .eq("id", assessmentId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (fetchError || !assessment) return { error: "Assessment not found." };

  const { count: submissionCount } = await supabase
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("assessment_id", assessmentId);

  if (submissionCount && submissionCount > 0) {
    return { error: "This assessment has submissions or marks. It can't be deleted." };
  }

  // Storage delete first: it's safe to retry, so nothing is left orphaned if
  // the row delete below fails afterwards.
  if (assessment.attachment_path) {
    const { error: storageError } = await supabase.storage
      .from("course-files")
      .remove([assessment.attachment_path]);
    if (storageError) return { error: "Could not delete the attachment. Please try again." };
  }

  const { error } = await supabase.from("assessments").delete().eq("id", assessmentId).eq("course_id", courseId);

  if (error) {
    if (error.code === "23503") {
      return { error: "This assessment has submissions or marks. It can't be deleted." };
    }
    return { error: "Could not delete the assessment. Please try again." };
  }

  revalidatePath(`/admin/courses/${courseId}`);
  return { error: null };
}

// Takes the storage path directly (not an assessment id) so the admin can
// preview a just-uploaded attachment before the assessment form is even
// saved, not only an already-persisted one.
export async function getSignedAttachmentUrlByPath(
  attachmentPath: string,
): Promise<{ url: string | null; error: string | null }> {
  await requireAdmin();

  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("course-files").createSignedUrl(attachmentPath, 60);

  if (error || !data) return { url: null, error: "Could not open the file. Please try again." };

  return { url: data.signedUrl, error: null };
}
