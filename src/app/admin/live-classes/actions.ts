"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { notifyNewLiveClass } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";
import { liveClassSchema, type LiveClassInput } from "@/lib/validation/live-classes";

export type LiveClassFormState = { error: string | null; success: boolean };
type ActionResult = { error: string | null };

function parseLiveClassForm(formData: FormData) {
  return liveClassSchema.safeParse({
    title: formData.get("title"),
    starts_at: formData.get("starts_at"),
    join_url: formData.get("join_url"),
    note: formData.get("note"),
    course_ids: formData.getAll("course_ids"),
    batch_ids: formData.getAll("batch_ids"),
  });
}

function saveArgs(data: LiveClassInput) {
  return {
    p_title: data.title,
    p_starts_at: data.starts_at,
    p_join_url: data.join_url,
    p_note: data.note ?? undefined,
    p_course_ids: data.course_ids,
    p_batch_ids: data.batch_ids,
  };
}

function revalidateLiveClasses() {
  revalidatePath("/admin/live-classes");
  revalidatePath("/student");
}

export async function createLiveClass(
  _prevState: LiveClassFormState,
  formData: FormData,
): Promise<LiveClassFormState> {
  await requireAdmin();

  const parsed = parseLiveClassForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again.", success: false };
  }

  const supabase = await createClient();
  // The class and its targets are saved together; students are notified only
  // once both exist.
  const { data: createdId, error } = await supabase.rpc("save_live_class", saveArgs(parsed.data));

  if (error) {
    return { error: "Could not add the class. Please try again.", success: false };
  }

  await notifyNewLiveClass(supabase, createdId);

  revalidateLiveClasses();
  return { error: null, success: true };
}

/** Editing never re-notifies students (owner decision). */
export async function updateLiveClass(
  liveClassId: string,
  _prevState: LiveClassFormState,
  formData: FormData,
): Promise<LiveClassFormState> {
  await requireAdmin();

  const parsed = parseLiveClassForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again.", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_live_class", { ...saveArgs(parsed.data), p_live_class_id: liveClassId });

  if (error) {
    return { error: "Could not save the class. Please try again.", success: false };
  }

  revalidateLiveClasses();
  return { error: null, success: true };
}

export async function deleteLiveClass(liveClassId: string): Promise<ActionResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase.from("live_classes").delete().eq("id", liveClassId);

  if (error) {
    return { error: "Could not delete the class. Please try again." };
  }

  revalidateLiveClasses();
  return { error: null };
}
