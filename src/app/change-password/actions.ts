"use server";

import { redirect } from "next/navigation";
import { dashboardPathFor, requirePasswordChangeUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { changePasswordSchema } from "@/lib/validation/auth";

export type ChangePasswordState = { error: string | null };

export async function changePassword(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  // Re-checks the session, the profile and the active flag on the server.
  const profile = await requirePasswordChangeUser();

  const parsed = changePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };

  // Students have no update policy on profiles, so the flag is cleared by a
  // SECURITY DEFINER function scoped to the caller.
  const { error: rpcError } = await supabase.rpc("complete_password_change");
  if (rpcError) {
    return {
      error: "Your password was changed, but the account could not be updated. Contact the academy.",
    };
  }

  redirect(dashboardPathFor(profile.role) ?? "/login");
}
