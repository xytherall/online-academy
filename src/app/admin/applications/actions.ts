"use server";

import { revalidatePath } from "next/cache";
import { getApplication } from "@/lib/applications";
import { requireAdmin } from "@/lib/auth";
import { createStudentAccount, deleteStudentAccount } from "@/lib/create-student-account";
import { getRequestOrigin } from "@/lib/request-origin";
import { createClient } from "@/lib/supabase/server";
import {
  acceptApplicationSchema,
  type AcceptApplicationInput,
} from "@/lib/validation/applications";

export type AcceptApplicationResult =
  | { ok: true; studentId: string; email: string; password: string; loginUrl: string }
  | { ok: false; error: string };

export type ApplicationActionResult = { error: string | null };

const NOT_FOUND_ERROR = "That application no longer exists.";
const ALREADY_REVIEWED_ERROR =
  "This application has already been reviewed, possibly by another admin. Reload the page to see its current state.";
const UNKNOWN_COURSE_ERROR = "One of the chosen courses no longer exists. Please reload the page.";

function revalidateApplication(applicationId: string) {
  revalidatePath("/admin/applications");
  revalidatePath(`/admin/applications/${applicationId}`);
  // The nav badge and the overview card both count pending applications, and
  // the badge is rendered by the admin layout on every admin route.
  revalidatePath("/admin");
}

/**
 * SPEC §6 "Accept": create the student's account, enroll them, optionally
 * assign a batch, and mark the application accepted — reusing the same
 * account-creation function as "Add student" so the two can never drift.
 */
export async function acceptApplication(
  applicationId: string,
  input: AcceptApplicationInput,
): Promise<AcceptApplicationResult> {
  const admin = await requireAdmin();

  const parsed = acceptApplicationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }
  const data = parsed.data;

  const supabase = await createClient();

  const application = await getApplication(supabase, applicationId);
  if (!application) return { ok: false, error: NOT_FOUND_ERROR };
  // Friendly pre-check. The guarded update below is the actual race guard.
  if (application.status !== "pending") return { ok: false, error: ALREADY_REVIEWED_ERROR };

  // The admin may adjust the courses, so validate what they sent rather than
  // trusting the application's stored ids. Unlike the public form these need
  // not be published — an admin enrolling a student is not applying, and
  // "Add student" offers unpublished courses too (SPEC §3: an enrolled student
  // can see an unpublished course).
  const { data: existingCourses, error: coursesError } = await supabase
    .from("courses")
    .select("id")
    .in("id", data.course_ids);
  if (coursesError) return { ok: false, error: "Could not check the chosen courses. Please try again." };
  if ((existingCourses?.length ?? 0) !== data.course_ids.length) {
    return { ok: false, error: UNKNOWN_COURSE_ERROR };
  }

  if (data.batch_id) {
    const { data: batch } = await supabase
      .from("batches")
      .select("id")
      .eq("id", data.batch_id)
      .maybeSingle();
    if (!batch) return { ok: false, error: "That batch no longer exists. Please reload the page." };
  }

  const created = await createStudentAccount(supabase, {
    email: application.email,
    password: data.password,
    full_name: application.full_name,
    phone: application.phone,
    whatsapp: application.whatsapp,
    country: application.country,
    school: application.school,
    guardian_name: application.guardian_name,
    guardian_phone: application.guardian_phone,
    guardian_email: application.guardian_email,
    batch_id: data.batch_id,
    course_ids: data.course_ids,
  });
  if (!created.ok) return { ok: false, error: created.error };

  // Guarded on status so two admins reviewing the same application cannot both
  // accept it. Whoever loses this race created an auth user that must not be
  // left behind.
  const { count, error: claimError } = await supabase
    .from("applications")
    .update(
      {
        status: "accepted",
        student_id: created.studentId,
        reviewed_by: admin.id,
        reviewed_at: new Date().toISOString(),
      },
      { count: "exact" },
    )
    .eq("id", applicationId)
    .eq("status", "pending");

  if (claimError || count === 0) {
    await deleteStudentAccount(created.studentId);
    return {
      ok: false,
      error: claimError
        ? "Could not mark the application accepted, so the new account was removed. Please try again."
        : ALREADY_REVIEWED_ERROR,
    };
  }

  revalidateApplication(applicationId);
  revalidatePath("/admin/students");

  // Built from this request's origin so it is right in production without a
  // hardcoded domain. The password is returned for a single on-screen display
  // and is never stored anywhere.
  const loginUrl = `${await getRequestOrigin()}/login`;
  return {
    ok: true,
    studentId: created.studentId,
    email: application.email,
    password: data.password,
    loginUrl,
  };
}

export async function rejectApplication(applicationId: string): Promise<ApplicationActionResult> {
  const admin = await requireAdmin();

  const supabase = await createClient();

  const { count, error } = await supabase
    .from("applications")
    .update(
      { status: "rejected", reviewed_by: admin.id, reviewed_at: new Date().toISOString() },
      { count: "exact" },
    )
    .eq("id", applicationId)
    .eq("status", "pending");

  if (error) return { error: "Could not reject the application. Please try again." };
  if (count === 0) return { error: ALREADY_REVIEWED_ERROR };

  revalidateApplication(applicationId);
  return { error: null };
}

/**
 * Only a rejected application can be deleted, for privacy — it holds contact
 * and guardian details the academy has no reason to keep. A pending one still
 * needs reviewing, and an accepted one is the record of how a current student
 * joined.
 */
export async function deleteApplication(applicationId: string): Promise<ApplicationActionResult> {
  await requireAdmin();

  const supabase = await createClient();

  const { count, error } = await supabase
    .from("applications")
    .delete({ count: "exact" })
    .eq("id", applicationId)
    .eq("status", "rejected");

  if (error) return { error: "Could not delete the application. Please try again." };
  if (count === 0) {
    return { error: "Only a rejected application can be deleted. Reload the page and try again." };
  }

  revalidateApplication(applicationId);
  return { error: null };
}
