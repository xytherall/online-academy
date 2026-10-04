import { z } from "zod";

// Must match the questions_body_length / questions_answer_length checks in
// supabase/migrations/20261004181234_stage18_questions.sql.
export const MAX_QUESTION_LENGTH = 5000;

/** Select value for a question that isn't about one course. */
export const GENERAL_COURSE_VALUE = "general";

const nullablePath = z.preprocess(
  (value) => (typeof value === "string" && value.length > 0 ? value : null),
  z.string().max(500).nullable(),
);

export const askQuestionSchema = z.object({
  course_id: z.preprocess(
    (value) => (value === GENERAL_COURSE_VALUE || value === "" ? null : value),
    z.uuid({ error: "Choose a course or General" }).nullable(),
  ),
  body: z
    .string()
    .trim()
    .min(1, "Write your question")
    .max(MAX_QUESTION_LENGTH, `Your question must be ${MAX_QUESTION_LENGTH.toLocaleString()} characters or fewer`),
  attachment_path: nullablePath,
});

export type AskQuestionInput = z.input<typeof askQuestionSchema>;

export const answerQuestionSchema = z.object({
  answer: z
    .string()
    .trim()
    .min(1, "Write an answer")
    .max(MAX_QUESTION_LENGTH, `The answer must be ${MAX_QUESTION_LENGTH.toLocaleString()} characters or fewer`),
  answer_attachment_path: nullablePath,
});

export type AnswerQuestionInput = z.input<typeof answerQuestionSchema>;
