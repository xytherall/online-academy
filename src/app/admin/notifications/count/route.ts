import { NextResponse } from "next/server";
import { getAuthState } from "@/lib/auth";
import { getAdminBellCount } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";

/**
 * Current bell count for the signed-in admin. Re-fetched by the header bell
 * on every client-side navigation and when the tab regains focus, because
 * the admin layout is not re-rendered when moving between pages inside it.
 */
export async function GET() {
  const state = await getAuthState();
  if (state.status !== "ok" || state.profile.role !== "admin" || !state.profile.is_active) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }

  const supabase = await createClient();
  const count = await getAdminBellCount(supabase, state.profile.id);
  return NextResponse.json({ count }, { headers: { "Cache-Control": "no-store" } });
}
