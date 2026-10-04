import { z } from "zod";
import { saudiLocalToIso } from "@/lib/live-classes-core";

// Lengths must match the checks in
// supabase/migrations/20261004191728_stage19_live_classes.sql.

/** Select value for a class that is for every student. */
export const EVERYONE_VALUE = "everyone";

export const liveClassSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title must be 200 characters or fewer"),
  // A datetime-local value, read as Saudi time and stored as UTC.
  starts_at: z
    .string()
    .transform((value, ctx) => {
      const iso = saudiLocalToIso(value);
      if (!iso) {
        ctx.addIssue({ code: "custom", message: "Choose the date and time" });
        return z.NEVER;
      }
      return iso;
    }),
  join_url: z
    .string()
    .trim()
    .min(1, "Join link is required")
    .max(2000, "Join link must be 2,000 characters or fewer")
    .refine((value) => {
      if (/\s/.test(value)) return false;
      try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:";
      } catch {
        return false;
      }
    }, "Enter a full link starting with https://"),
  note: z.preprocess(
    (value) => (typeof value === "string" && value.trim().length > 0 ? value.trim() : null),
    z.string().max(1000, "Note must be 1,000 characters or fewer").nullable(),
  ),
  batch_id: z.preprocess(
    (value) => (value === EVERYONE_VALUE || value === "" || value == null ? null : value),
    z.uuid({ error: "Choose who this class is for" }).nullable(),
  ),
});

export type LiveClassFormInput = z.input<typeof liveClassSchema>;
