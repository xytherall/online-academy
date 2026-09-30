import { z } from "zod";

const titleSchema = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(200, "Title must be 200 characters or fewer");

const bodySchema = z
  .string()
  .trim()
  .min(1, "Body is required")
  .max(5000, "Body must be 5,000 characters or fewer");

const nullableUuid = z.preprocess(
  (value) => (typeof value === "string" && value.length > 0 ? value : null),
  z.uuid().nullable(),
);

export const announcementSchema = z
  .object({
    title: titleSchema,
    body: bodySchema,
    target_type: z.enum(["everyone", "course", "batch"], { error: "Choose who this is for" }),
    course_id: nullableUuid,
    batch_id: nullableUuid,
  })
  .superRefine((value, ctx) => {
    if (value.target_type === "course" && !value.course_id) {
      ctx.addIssue({ code: "custom", message: "Choose a course", path: ["course_id"] });
    }
    if (value.target_type === "batch" && !value.batch_id) {
      ctx.addIssue({ code: "custom", message: "Choose a batch", path: ["batch_id"] });
    }
  })
  .transform((value) => ({
    title: value.title,
    body: value.body,
    course_id: value.target_type === "course" ? value.course_id : null,
    batch_id: value.target_type === "batch" ? value.batch_id : null,
  }));

export type AnnouncementInput = z.infer<typeof announcementSchema>;
