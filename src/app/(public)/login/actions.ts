"use server";

import { redirect } from "next/navigation";
import { dashboardPathFor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validation/auth";

export type LoginState = { error: string | null };

// Deliberately the same message for a wrong email, a wrong password and a
// malformed submission, so the form never reveals whether an account exists.
const GENERIC_ERROR = "Invalid email or password.";

export async function signIn(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) return { error: GENERIC_ERROR };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) return { error: GENERIC_ERROR };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active, must_change_password")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    return { error: GENERIC_ERROR };
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();
    return { error: "This account has been deactivated. Please contact the academy." };
  }

  if (profile.must_change_password) redirect("/change-password");

  const destination = dashboardPathFor(profile.role);
  if (!destination) {
    await supabase.auth.signOut();
    return { error: "This account has no portal access. Please contact the academy." };
  }

  redirect(destination);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
