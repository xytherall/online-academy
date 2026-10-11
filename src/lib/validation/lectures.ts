import { z } from "zod";
import { parseVimeoUrl, toStoredVimeoId } from "@/lib/vimeo";

// Lengths must match the checks in
// supabase/migrations/20261011160000_stage24_lectures.sql.

export const lectureSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title must be 200 characters or fewer"),
  vimeo_url: z
    .string()
    .trim()
    .min(1, "Vimeo link is required")
    .transform((value, ctx) => {
      const video = parseVimeoUrl(value);
      if (!video) {
        ctx.addIssue({
          code: "custom",
          message: "Paste a Vimeo video link, like https://vimeo.com/123456789",
        });
        return z.NEVER;
      }
      return toStoredVimeoId(video);
    }),
  description: z.preprocess(
    (value) => (typeof value === "string" && value.trim().length > 0 ? value.trim() : null),
    z.string().max(1000, "Note must be 1,000 characters or fewer").nullable(),
  ),
  is_published: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export type LectureFormInput = z.input<typeof lectureSchema>;
