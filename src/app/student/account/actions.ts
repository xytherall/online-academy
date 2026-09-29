"use server";

import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { changeOwnPasswordSchema } from "@/lib/validation/auth";

export type ChangeOwnPasswordState = { error: string | null; success: boolean };

export async function changeOwnPassword(
  _prevState: ChangeOwnPasswordState,
  formData: FormData,
): Promise<ChangeOwnPasswordState> {
  const profile = await requireStudent();

  const parsed = changeOwnPasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Please check the form and try again.",
      success: false,
    };
  }

  // Verify the current password on a separate, non-persisting client so this
  // check never touches the student's real cookie-based session.
  const verifier = createSupabaseJsClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { error: signInError } = await verifier.auth.signInWithPassword({
    email: profile.email,
    password: parsed.data.currentPassword,
  });
  await verifier.auth.signOut();

  if (signInError) {
    return { error: "Current password is incorrect.", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message, success: false };

  return { error: null, success: true };
}
