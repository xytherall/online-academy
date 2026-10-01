import type { Tables } from "@/lib/supabase/database.types";

export type SiteSettings = Tables<"site_settings">;

/**
 * Shown in page titles and site chrome (never the hero headline) when the
 * admin hasn't set an academy name yet. A generic product label, not an
 * invented academy name (SPEC §2/§12: never invent one).
 */
export const FALLBACK_SITE_LABEL = "Student Portal";

export function buildPublicAssetUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return `${base}/storage/v1/object/public/public-assets/${path}`;
}

/** wa.me links need digits only (no "+", spaces or punctuation). Returns null if nothing usable is left. */
export function buildWhatsAppUrl(rawNumber: string, message?: string): string | null {
  const digits = rawNumber.replace(/\D/g, "");
  if (digits.length === 0) return null;
  return message ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : `https://wa.me/${digits}`;
}
