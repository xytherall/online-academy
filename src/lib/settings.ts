import type { Tables } from "@/lib/supabase/database.types";

export type SiteSettings = Tables<"site_settings">;

/** Neutral fallback shown when the admin hasn't set an academy name yet (SPEC §2/§12: never invent one). */
export const FALLBACK_ACADEMY_NAME = "Academy Portal";

export function buildPublicAssetUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return `${base}/storage/v1/object/public/public-assets/${path}`;
}

/** wa.me links need digits only (no "+", spaces or punctuation). Returns null if nothing usable is left. */
export function buildWhatsAppUrl(rawNumber: string): string | null {
  const digits = rawNumber.replace(/\D/g, "");
  return digits.length > 0 ? `https://wa.me/${digits}` : null;
}
