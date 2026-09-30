"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { verifyApplyToken } from "@/lib/apply-token";
import { createClient } from "@/lib/supabase/server";
import { applicationSchema } from "@/lib/validation/applications";
import { HONEYPOT_FIELD } from "./honeypot";

export type ApplyFormState = { error: string | null };

const GENERIC_ERROR = "Something went wrong sending your application. Please try again.";
const DUPLICATE_PENDING_ERROR =
  "You already have an application being reviewed. We will be in touch soon — please contact us if you need to change anything.";
const COURSE_MISMATCH_ERROR =
  "One of the courses you chose is no longer available. Please reload the page and choose again.";
const FLOOD_ERROR =
  "We're receiving a lot of applications right now — please try again in a few minutes.";
const STALE_FORM_ERROR =
  "This form has been open for a while. Please reload the page and send it again.";

export async function submitApplication(
  _prevState: ApplyFormState,
  formData: FormData,
): Promise<ApplyFormState> {
  // Spam checks first, so a bot never reaches the database or consumes any of
  // the flood-limit budget (SPEC §6: honeypot + server-side validation, no
  // captcha).
  const honeypotValue = formData.get(HONEYPOT_FIELD);
  const honeypotFilled = typeof honeypotValue === "string" && honeypotValue.trim().length > 0;
  const tokenVerdict = verifyApplyToken(formData.get("apply_token"));

  if (tokenVerdict.status === "expired") {
    // A real person who left the tab open. Telling them is the whole point —
    // silently "succeeding" would lose an application they think they sent.
    return { error: STALE_FORM_ERROR };
  }

  if (honeypotFilled || tokenVerdict.status !== "ok") {
    // Show the success page without saving anything: a bot learns nothing about
    // why it was refused, and there is nobody to apologise to.
    redirect("/apply/success");
  }

  const parsed = applicationSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    whatsapp: formData.get("whatsapp"),
    country: formData.get("country"),
    school: formData.get("school"),
    level: formData.get("level"),
    course_ids: formData.getAll("course_ids"),
    guardian_name: formData.get("guardian_name"),
    guardian_phone: formData.get("guardian_phone"),
    guardian_email: formData.get("guardian_email"),
    heard_about: formData.get("heard_about"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }
  const data = parsed.data;

  const supabase = await createClient();

  // Friendly pre-check that the chosen courses are still published and match
  // the chosen level. applications_validate_courses is the real backstop.
  const { data: chosenCourses, error: coursesError } = await supabase
    .from("courses")
    .select("id")
    .in("id", data.course_ids)
    .eq("is_published", true)
    .eq("level", data.level);

  if (coursesError) return { error: GENERIC_ERROR };
  if ((chosenCourses?.length ?? 0) !== data.course_ids.length) {
    return { error: COURSE_MISMATCH_ERROR };
  }

  // The ordinary anon/cookie client, never the secret key: the insert is
  // allowed by the "Anyone can submit an application" RLS policy, which also
  // pins status to 'pending' and forbids setting any review field. No .select()
  // is chained — anon has INSERT but deliberately no SELECT on this table.
  const { error } = await supabase.from("applications").insert({
    full_name: data.full_name,
    email: data.email,
    phone: data.phone,
    whatsapp: data.whatsapp,
    country: data.country,
    school: data.school,
    level: data.level,
    course_ids: data.course_ids,
    guardian_name: data.guardian_name,
    guardian_phone: data.guardian_phone,
    guardian_email: data.guardian_email,
    heard_about: data.heard_about,
  });

  if (error) {
    // 23505: the unique partial index on lower(email) where status = 'pending'.
    if (error.code === "23505") return { error: DUPLICATE_PENDING_ERROR };
    // 54000: check_application_flood_limit().
    if (error.code === "54000") return { error: FLOOD_ERROR };
    // 23514: validate_application_courses(), i.e. the pre-check above lost a
    // race with an admin unpublishing a course.
    if (error.code === "23514") return { error: COURSE_MISMATCH_ERROR };
    return { error: GENERIC_ERROR };
  }

  revalidatePath("/admin/applications");
  revalidatePath("/admin");
  redirect("/apply/success");
}
