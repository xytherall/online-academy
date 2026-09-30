import type { Json } from "@/lib/supabase/database.types";

const SOCIAL_LINK_LABELS = {
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  x: "X",
} as const;

export type SocialLinkEntry = {
  key: keyof typeof SOCIAL_LINK_LABELS;
  label: (typeof SOCIAL_LINK_LABELS)[keyof typeof SOCIAL_LINK_LABELS];
  url: string;
};

/** social_links is stored as loose JSON; only well-formed https URLs for known keys are shown. */
export function getSocialLinkEntries(socialLinks: Json | null): SocialLinkEntry[] {
  if (!socialLinks || typeof socialLinks !== "object" || Array.isArray(socialLinks)) return [];

  return (Object.keys(SOCIAL_LINK_LABELS) as (keyof typeof SOCIAL_LINK_LABELS)[])
    .map((key) => {
      const value = (socialLinks as Record<string, unknown>)[key];
      if (typeof value !== "string" || !value.startsWith("https://")) return null;
      return { key, label: SOCIAL_LINK_LABELS[key], url: value };
    })
    .filter((entry): entry is SocialLinkEntry => entry !== null);
}
