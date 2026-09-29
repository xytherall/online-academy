import { z } from "zod";

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Slug is required")
  .max(120, "Slug must be 120 characters or fewer")
  .regex(SLUG_PATTERN, "Use lowercase letters, numbers and hyphens only");

export const courseSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title must be 200 characters or fewer"),
  slug: slugSchema,
  level: z.enum(["O", "A"], { error: "Choose a level" }),
  description: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z.string().max(10000, "Description must be 10,000 characters or fewer"),
  ).transform((value) => ((value as string).length > 0 ? (value as string) : null)),
  // A hidden input always sends "true"/"false" — z.coerce.boolean() would treat
  // "false" as truthy, so this is spelled out explicitly.
  is_published: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export type CourseInput = z.infer<typeof courseSchema>;
