import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";

/**
 * SPEC §6's "one server-side operation": create the student's auth account,
 * fill in their profile, enroll them in the chosen courses and optionally
 * assign a batch.
 *
 * Shared by "Add student" (admin/students/actions.ts) and "Accept application"
 * (admin/applications/actions.ts) so there is exactly one account-creation path
 * — the two must not drift on rollback behaviour, the duplicate-email check or
 * the must_change_password flag.
 *
 * True Auth+Postgres atomicity is not available (the auth user lives outside
 * the database transaction), so a later failure compensates by deleting the
 * auth user again, which cascades the trigger-created profile row and any
 * enrollments with it. Same pattern as the Stage 3 resource-upload cleanup.
 *
 * The caller is responsible for verifying the session (requireAdmin()) and for
 * validating its own input with Zod before calling this.
 */

export const EMAIL_IN_USE_ERROR = "An account with this email already exists.";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type CreateStudentAccountInput = {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  whatsapp: string | null;
  country: string;
  school: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_email: string | null;
  batch_id: string | null;
  course_ids: string[];
};

export type CreateStudentAccountResult =
  | { ok: true; studentId: string }
  | { ok: false; error: string };

export async function createStudentAccount(
  supabase: SupabaseServerClient,
  input: CreateStudentAccountInput,
): Promise<CreateStudentAccountResult> {
  // Friendly pre-check; auth's own email_exists error below is the backstop.
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", input.email)
    .maybeSingle();
  if (existing) return { ok: false, error: EMAIL_IN_USE_ERROR };

  const adminClient = createAdminClient();

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.full_name },
  });
  if (authError || !authData.user) {
    if (authError?.code === "email_exists") return { ok: false, error: EMAIL_IN_USE_ERROR };
    return { ok: false, error: "Could not create the student account. Please try again." };
  }

  const studentId = authData.user.id;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: input.full_name,
      phone: input.phone,
      whatsapp: input.whatsapp,
      country: input.country,
      school: input.school,
      guardian_name: input.guardian_name,
      guardian_phone: input.guardian_phone,
      guardian_email: input.guardian_email,
      batch_id: input.batch_id,
      must_change_password: true,
    })
    .eq("id", studentId);

  if (profileError) {
    await adminClient.auth.admin.deleteUser(studentId);
    return { ok: false, error: "Could not save the student's details. Please try again." };
  }

  const { error: enrollmentsError } = await supabase
    .from("enrollments")
    .insert(input.course_ids.map((courseId) => ({ student_id: studentId, course_id: courseId })));

  if (enrollmentsError) {
    await adminClient.auth.admin.deleteUser(studentId);
    return { ok: false, error: "Could not enroll the student in the chosen courses. Please try again." };
  }

  return { ok: true, studentId };
}

/**
 * Undo a createStudentAccount() that a *later* step could not commit — used by
 * "Accept application" when another admin wins the race to accept the same
 * application. Deleting the auth user cascades the profile and enrollments.
 */
export async function deleteStudentAccount(studentId: string): Promise<void> {
  await createAdminClient().auth.admin.deleteUser(studentId);
}
