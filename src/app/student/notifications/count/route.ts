import { NextResponse } from "next/server";
import { getAuthState } from "@/lib/auth";
import { getBellCount } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";

/**
 * Current bell count for the signed-in student. The header bell re-fetches
 * this on every client-side navigation and when the tab regains focus,
 * because the student layout (where the first count is rendered) is not
 * re-rendered when moving between pages inside it.
 */
export async function GET() {
  const state = await getAuthState();
  if (state.status !== "ok" || state.profile.role !== "student" || !state.profile.is_active) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }

  const supabase = await createClient();
  const count = await getBellCount(supabase, state.profile);
  return NextResponse.json({ count }, { headers: { "Cache-Control": "no-store" } });
}
