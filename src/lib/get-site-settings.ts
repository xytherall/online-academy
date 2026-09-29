import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { SiteSettings } from "@/lib/settings";

/** Cached per request: read once, used by generateMetadata and the page that renders from it. */
export const getSiteSettings = cache(async (): Promise<SiteSettings | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("*").maybeSingle();
  return data;
});
