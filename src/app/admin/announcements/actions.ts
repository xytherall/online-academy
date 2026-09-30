"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { announcementSchema } from "@/lib/validation/announcements";

export type AnnouncementFormState = { error: string | null; success: boolean };
type ActionResult = { error: string | null };

function parseAnnouncementForm(formData: FormData) {
  return announcementSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    target_type: formData.get("target_type"),
    course_id: formData.get("course_id"),
    batch_id: formData.get("batch_id"),
  });
}

export async function createAnnouncement(
  _prevState: AnnouncementFormState,
  formData: FormData,
): Promise<AnnouncementFormState> {
  const profile = await requireAdmin();

  const parsed = parseAnnouncementForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again.", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").insert({ ...parsed.data, created_by: profile.id });

  if (error) {
    return { error: "Could not create the announcement. Please try again.", success: false };
  }

  revalidatePath("/admin/announcements");
  revalidatePath("/student/announcements");
  revalidatePath("/student");
  return { error: null, success: true };
}

export async function updateAnnouncement(
  announcementId: string,
  _prevState: AnnouncementFormState,
  formData: FormData,
): Promise<AnnouncementFormState> {
  await requireAdmin();

  const parsed = parseAnnouncementForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again.", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").update(parsed.data).eq("id", announcementId);

  if (error) {
    return { error: "Could not save the announcement. Please try again.", success: false };
  }

  revalidatePath("/admin/announcements");
  revalidatePath("/student/announcements");
  revalidatePath("/student");
  return { error: null, success: true };
}

export async function deleteAnnouncement(announcementId: string): Promise<ActionResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").delete().eq("id", announcementId);

  if (error) {
    return { error: "Could not delete the announcement. Please try again." };
  }

  revalidatePath("/admin/announcements");
  revalidatePath("/student/announcements");
  revalidatePath("/student");
  return { error: null };
}
