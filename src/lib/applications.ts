import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type Application = Tables<"applications">;

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Reads one application. Admin-only by RLS ("Admins can read every
 * application"), so this returns null for a non-admin caller as well as for an
 * id that does not exist — the page treats both as a 404.
 */
export async function getApplication(
  supabase: SupabaseServerClient,
  applicationId: string,
): Promise<Application | null> {
  const { data } = await supabase
    .from("applications")
    .select("*")
    .eq("id", applicationId)
    .maybeSingle();
  return data;
}

/** Drives the nav badge and the /admin overview card. */
export async function getPendingApplicationCount(
  supabase: SupabaseServerClient,
): Promise<number> {
  const { count } = await supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  return count ?? 0;
}
