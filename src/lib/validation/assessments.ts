import { z } from "zod";

// Assessment attachments reuse the course-files bucket, so they share its
// limits — see src/lib/validation/resources.ts and
// supabase/migrations/20260929130200_stage3_storage_buckets.sql.
export { ALLOWED_RESOURCE_MIME_TYPES, MAX_RESOURCE_FILE_BYTES } from "./resources";

const titleSchema = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(200, "Title must be 200 characters or fewer");

const instructionsSchema = z
  .string()
  .trim()
  .min(1, "Instructions are required")
  .max(10000, "Instructions must be 10,000 characters or fewer");

// One decimal place, matching the DB check constraints.
const marksSchema = z
  .number()
  .positive("Total marks must be greater than 0")
  .refine((value) => Math.round(value * 10) === value * 10, "Use at most one decimal place");

export const assessmentSchema = z.object({
  type: z.enum(["assignment", "test"], { error: "Choose a type" }),
  title: titleSchema,
  instructions: instructionsSchema,
  // Converted to UTC client-side (toUtcIso) before this is parsed.
  due_at: z.iso.datetime({ offset: true, message: "Choose a due date" }),
  total_marks: z.preprocess((value) => (typeof value === "string" ? Number(value) : value), marksSchema),
  batch_id: z.preprocess(
    (value) => (typeof value === "string" && value.length > 0 ? value : null),
    z.uuid().nullable(),
  ),
  attachment_path: z.preprocess(
    (value) => (typeof value === "string" && value.length > 0 ? value : null),
    z.string().nullable(),
  ),
});

export type AssessmentInput = z.infer<typeof assessmentSchema>;
