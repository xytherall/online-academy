import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Service-role client. Bypasses RLS entirely — only call this from inside a
 * Server Action that has already verified the caller is an admin (via
 * requireAdmin()), and only for Auth Admin API calls (creating/updating/
 * deleting auth users). Table reads/writes should keep using the normal
 * cookie-based createClient() from ./server, which already has full admin
 * access via RLS.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
