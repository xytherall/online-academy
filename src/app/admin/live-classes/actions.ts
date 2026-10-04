"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { notifyNewLiveClass } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";
import { liveClassSchema } from "@/lib/validation/live-classes";

export type LiveClassFormState = { error: string | null; success: boolean };
type ActionResult = { error: string | null };

function parseLiveClassForm(formData: FormData) {
  return liveClassSchema.safeParse({
    title: formData.get("title"),
    starts_at: formData.get("starts_at"),
    join_url: formData.get("join_url"),
    note: formData.get("note"),
    batch_id: formData.get("batch_id"),
  });
}

function revalidateLiveClasses() {
  revalidatePath("/admin/live-classes");
  revalidatePath("/student");
}

export async function createLiveClass(
  _prevState: LiveClassFormState,
  formData: FormData,
): Promise<LiveClassFormState> {
  const profile = await requireAdmin();

  const parsed = parseLiveClassForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again.", success: false };
  }

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("live_classes")
    .insert({ ...parsed.data, created_by: profile.id })
    .select("id")
    .single();

  if (error) {
    return { error: "Could not add the class. Please try again.", success: false };
  }

  await notifyNewLiveClass(supabase, created.id);

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
  const { error } = await supabase.from("live_classes").update(parsed.data).eq("id", liveClassId);

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
