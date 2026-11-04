import { z } from "zod";
import { targetIdsSchema } from "./post-targets";

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

export const announcementSchema = z.object({
  title: titleSchema,
  body: bodySchema,
  course_ids: targetIdsSchema("Choose valid courses"),
  batch_ids: targetIdsSchema("Choose valid batches"),
});

export type AnnouncementInput = z.infer<typeof announcementSchema>;
