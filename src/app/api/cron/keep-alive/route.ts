import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Keep-alive (SPEC §11 free-tier notes): free Supabase projects pause after
 * about a week with no database activity. Called a few times a week by the
 * Netlify scheduled function in netlify/functions/keep-alive.mjs with
 * `Authorization: Bearer <CRON_SECRET>`, it makes one tiny read of a public
 * table with the ordinary publishable key. It reads nothing private and
 * changes nothing.
 */
export async function POST(request: Request) {
  if (!process.env.CRON_SECRET) {
    console.error("CRON_SECRET is not set; refusing to run the keep-alive.");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }
  if (!isCronAuthorized(request)) return NextResponse.json({ error: "Not allowed" }, { status: 401 });

  const supabase = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { error } = await supabase.from("site_settings").select("id").limit(1);

  if (error) {
    console.error("Keep-alive query failed:", error.message);
    return NextResponse.json({ error: "Database query failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
