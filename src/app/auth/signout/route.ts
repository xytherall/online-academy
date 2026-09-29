import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// A route handler, not a server component: signing out writes cookies, which
// only route handlers and server actions are allowed to do.
export async function GET(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const reason = new URL(request.url).searchParams.get("reason");
  const target =
    reason === "deactivated"
      ? "/login?deactivated=1"
      : reason === "no-access"
        ? "/login?reason=no-access"
        : "/login";
  return NextResponse.redirect(new URL(target, request.url));
}
