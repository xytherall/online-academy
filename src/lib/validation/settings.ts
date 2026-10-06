import { z } from "zod";

// Must match the public-assets bucket limits in
// supabase/migrations/20260929130200_stage3_storage_buckets.sql.
export const ALLOWED_LOGO_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const MAX_LOGO_FILE_BYTES = 2 * 1024 * 1024;

const SOCIAL_LINK_KEYS = ["facebook", "instagram", "youtube", "tiktok", "linkedin", "x"] as const;

/** Blank input becomes null so an empty field never overwrites a real value with "". */
const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z.string().max(max, `Must be ${max} characters or fewer`),
  ).transform((value) => ((value as string).length > 0 ? (value as string) : null));

const optionalEmail = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : ""),
  z.union([z.literal(""), z.email("Enter a valid email address")]),
).transform((value) => (value.length > 0 ? value : null));

/** Blank input is omitted from the stored JSON rather than saved as "". */
const socialUrlField = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : ""),
  z.union([
    z.literal(""),
    z
      .string()
      .pipe(z.url("Enter a valid URL"))
      .refine((value) => value.startsWith("https://"), "Must start with https://"),
  ]),
).transform((value) => (value.length > 0 ? value : undefined));

export const socialLinksSchema = z.object(
  Object.fromEntries(SOCIAL_LINK_KEYS.map((key) => [key, socialUrlField])) as Record<
    (typeof SOCIAL_LINK_KEYS)[number],
    typeof socialUrlField
  >,
);

export type SocialLinks = z.infer<typeof socialLinksSchema>;

export const logoPathSchema = z.string().min(1).max(500);

export const settingsSchema = z.object({
  academy_name: optionalText(200),
  tagline: optionalText(300),
  about_text: optionalText(5000),
  about_page_text: optionalText(5000),
  contact_email: optionalEmail,
  contact_phone: optionalText(50),
  contact_whatsapp: optionalText(50),
  address: optionalText(500),
  social_links: socialLinksSchema,
});

export type SettingsInput = z.infer<typeof settingsSchema>;
