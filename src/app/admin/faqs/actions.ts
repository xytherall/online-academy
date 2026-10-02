"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { faqSchema } from "@/lib/validation/faqs";

export type FaqFormState = { error: string | null; success: boolean };
type ActionResult = { error: string | null };

function parseFaqForm(formData: FormData) {
  return faqSchema.safeParse({
    question: formData.get("question"),
    answer: formData.get("answer"),
  });
}

export async function createFaq(
  _prevState: FaqFormState,
  formData: FormData,
): Promise<FaqFormState> {
  await requireAdmin();

  const parsed = parseFaqForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again.", success: false };
  }

  const supabase = await createClient();

  // Explicit next value rather than relying on the column default, so every
  // row gets a distinct sort_order and the up/down swap in move_faq() always
  // has a well-defined adjacent row.
  const { data: last } = await supabase
    .from("faqs")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSortOrder = (last?.sort_order ?? -1) + 1;

  const { error } = await supabase.from("faqs").insert({ ...parsed.data, sort_order: nextSortOrder });

  if (error) {
    return { error: "Could not create the FAQ. Please try again.", success: false };
  }

  revalidatePath("/admin/faqs");
  revalidatePath("/");
  return { error: null, success: true };
}

export async function updateFaq(
  faqId: string,
  _prevState: FaqFormState,
  formData: FormData,
): Promise<FaqFormState> {
  await requireAdmin();

  const parsed = parseFaqForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again.", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("faqs").update(parsed.data).eq("id", faqId);

  if (error) {
    return { error: "Could not save the FAQ. Please try again.", success: false };
  }

  revalidatePath("/admin/faqs");
  revalidatePath("/");
  return { error: null, success: true };
}

export async function deleteFaq(faqId: string): Promise<ActionResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase.from("faqs").delete().eq("id", faqId);

  if (error) {
    return { error: "Could not delete the FAQ. Please try again." };
  }

  revalidatePath("/admin/faqs");
  revalidatePath("/");
  return { error: null };
}

export async function setFaqPublished(faqId: string, isPublished: boolean): Promise<ActionResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase.from("faqs").update({ is_published: isPublished }).eq("id", faqId);

  if (error) {
    return { error: "Could not update the FAQ. Please try again." };
  }

  revalidatePath("/admin/faqs");
  revalidatePath("/");
  return { error: null };
}

export async function moveFaq(faqId: string, direction: "up" | "down"): Promise<ActionResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase.rpc("move_faq", { p_faq_id: faqId, p_direction: direction });

  if (error) {
    return { error: "Could not reorder the FAQ. Please try again." };
  }

  revalidatePath("/admin/faqs");
  revalidatePath("/");
  return { error: null };
}
