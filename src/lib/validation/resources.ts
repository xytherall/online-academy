import { z } from "zod";

// Must match the course-files bucket limits in
// supabase/migrations/20260929130200_stage3_storage_buckets.sql.
export const ALLOWED_RESOURCE_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
export const MAX_RESOURCE_FILE_BYTES = 10 * 1024 * 1024;

const resourceTitleSchema = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(200, "Title must be 200 characters or fewer");

export const linkResourceSchema = z.object({
  title: resourceTitleSchema,
  kind: z.literal("link"),
  url: z
    .string()
    .trim()
    .pipe(z.url("Enter a valid URL"))
    .refine((value) => value.startsWith("https://"), "Link must start with https://"),
});

export const fileResourceMetaSchema = z.object({
  title: resourceTitleSchema,
  kind: z.literal("file"),
  file_path: z.string().min(1, "Upload a file first"),
});

export const resourceSchema = z.discriminatedUnion("kind", [
  linkResourceSchema,
  fileResourceMetaSchema,
]);

export type LinkResourceInput = z.infer<typeof linkResourceSchema>;
export type FileResourceMetaInput = z.infer<typeof fileResourceMetaSchema>;

export const resourceTitleUpdateSchema = z.object({
  title: resourceTitleSchema,
});
