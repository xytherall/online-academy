"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { notifyNewAnnouncement } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";
import { announcementSchema } from "@/lib/validation/announcements";

export type AnnouncementFormState = { error: string | null; success: boolean };
type ActionResult = { error: string | null };

function parseAnnouncementForm(formData: FormData) {
  return announcementSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    course_ids: formData.getAll("course_ids"),
    batch_ids: formData.getAll("batch_ids"),
  });
}

export async function createAnnouncement(
  _prevState: AnnouncementFormState,
  formData: FormData,
): Promise<AnnouncementFormState> {
  await requireAdmin();

  const parsed = parseAnnouncementForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again.", success: false };
  }

  const supabase = await createClient();
  // The post and its targets are saved together; students are notified only
  // once both exist.
  const { data: createdId, error } = await supabase.rpc("save_announcement", {
    p_title: parsed.data.title,
    p_body: parsed.data.body,
    p_course_ids: parsed.data.course_ids,
    p_batch_ids: parsed.data.batch_ids,
  });

  if (error) {
    return { error: "Could not create the announcement. Please try again.", success: false };
  }

  await notifyNewAnnouncement(supabase, createdId);

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
  const { error } = await supabase.rpc("save_announcement", {
    p_title: parsed.data.title,
    p_body: parsed.data.body,
    p_course_ids: parsed.data.course_ids,
    p_batch_ids: parsed.data.batch_ids,
    p_announcement_id: announcementId,
  });

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
