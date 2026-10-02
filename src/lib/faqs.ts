import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type PublicFaq = Tables<"faqs">;

export const getPublishedFaqs = cache(async (): Promise<PublicFaq[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("faqs")
    .select("*")
    .eq("is_published", true)
    .order("sort_order")
    .order("created_at");
  return data ?? [];
});
