import { z } from "zod";
import { QUIZ_MAX_OPTIONS, QUIZ_MAX_QUESTIONS } from "@/lib/quiz-format";

/** What a student sends when submitting: one 0-based option index per question, in order. */
export const submitQuizSchema = z.object({
  assessmentId: z.uuid(),
  answers: z
    .array(z.number().int().min(0).max(QUIZ_MAX_OPTIONS - 1))
    .min(1)
    .max(QUIZ_MAX_QUESTIONS),
});

/** Shape returned by the get_quiz_result() / submit_quiz() database functions. */
export const quizResultSchema = z.object({
  marks: z.number().nullable(),
  total: z.number(),
  submitted_at: z.string().nullable(),
  is_late: z.boolean(),
  questions: z.array(
    z.object({
      position: z.number(),
      question: z.string(),
      options: z.array(z.string()),
      chosen: z.number().nullable(),
      correct_index: z.number(),
    }),
  ),
});

export type QuizResult = z.infer<typeof quizResultSchema>;
