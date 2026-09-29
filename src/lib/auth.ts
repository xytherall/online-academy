import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type UserRole = Database["public"]["Enums"]["user_role"];

type AuthState =
  | { status: "anonymous" }
  | { status: "no-profile" }
  | { status: "ok"; profile: Profile };

/**
 * The teacher role exists in the database for later, but has no portal in v1
 * (SPEC §3), so it has no dashboard to land on.
 */
export function dashboardPathFor(role: UserRole): string | null {
  if (role === "admin") return "/admin";
  if (role === "student") return "/student";
  return null;
}

export async function getAuthState(): Promise<AuthState> {
  const supabase = await createClient();

  // getClaims() verifies the JWT instead of trusting the cookie. getSession()
  // must never be used for an auth decision.
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { status: "anonymous" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return { status: "no-profile" };
  return { status: "ok", profile };
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const state = await getAuthState();
  return state.status === "ok" ? state.profile : null;
}

/**
 * Logged in, has a profile, is active, and has a portal to use. Deactivated
 * users are checked here on every portal request, per SPEC §3.
 */
async function requireActiveProfile(): Promise<Profile> {
  const state = await getAuthState();

  if (state.status === "anonymous") redirect("/login");
  // Signing out writes cookies, which a server component cannot do, so these
  // go through the sign-out route handler.
  if (state.status === "no-profile") redirect("/auth/signout?reason=no-access");

  const { profile } = state;
  if (!profile.is_active) redirect("/auth/signout?reason=deactivated");
  if (!dashboardPathFor(profile.role)) redirect("/auth/signout?reason=no-access");

  return profile;
}

export async function requirePortalUser(): Promise<Profile> {
  const profile = await requireActiveProfile();
  if (profile.must_change_password) redirect("/change-password");
  return profile;
}

/** Used by /change-password itself, which must stay reachable while the flag is set. */
export async function requirePasswordChangeUser(): Promise<Profile> {
  return requireActiveProfile();
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await requirePortalUser();
  if (profile.role !== "admin") redirect(dashboardPathFor(profile.role) ?? "/login");
  return profile;
}

export async function requireStudent(): Promise<Profile> {
  const profile = await requirePortalUser();
  if (profile.role !== "student") redirect(dashboardPathFor(profile.role) ?? "/login");
  return profile;
}
