import { z } from "zod";

export const MAX_SUBMISSION_FILES = 10;

// One decimal place, matching the DB check constraint on submissions.marks
// and the submissions_check_marks trigger's [0, total_marks] range.
function marksValueSchema(totalMarks: number) {
  return z
    .number()
    .min(0, "Marks cannot be negative")
    .max(totalMarks, `Marks cannot exceed ${totalMarks}`)
    .refine((value) => Math.round(value * 10) === value * 10, "Use at most one decimal place");
}

// Empty marks clears the mark (and, per the admin marking rules, un-marks the
// submission) rather than being an invalid input.
export function buildSaveMarksSchema(totalMarks: number) {
  return z.object({
    marks: z.preprocess(
      (value) => (typeof value === "string" ? (value.trim() === "" ? null : Number(value)) : value),
      marksValueSchema(totalMarks).nullable(),
    ),
    feedback: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? null : value),
      z.string().max(5000).nullable(),
    ),
    counts_toward_report: z.preprocess((value) => value === "true" || value === true, z.boolean()),
  });
}
