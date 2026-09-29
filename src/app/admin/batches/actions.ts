"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getStudentProfile } from "@/lib/students";
import { createClient } from "@/lib/supabase/server";
import { batchSchema } from "@/lib/validation/batches";

export type BatchFormState = { error: string | null };
type ActionResult = { error: string | null };

const DUPLICATE_NAME_ERROR = "A batch with this name already exists. Choose a different name.";
const NOT_A_STUDENT_ERROR = "That account is not a student.";
const HAS_ASSESSMENTS_ERROR = "This batch has assessments. Move or delete them first.";

function parseBatchForm(formData: FormData) {
  return batchSchema.safeParse({
    name: formData.get("name"),
    notes: formData.get("notes"),
  });
}

export async function createBatch(
  _prevState: BatchFormState,
  formData: FormData,
): Promise<BatchFormState> {
  await requireAdmin();

  const parsed = parseBatchForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("batches")
    .select("id")
    .eq("name", parsed.data.name)
    .maybeSingle();
  if (existing) return { error: DUPLICATE_NAME_ERROR };

  const { data, error } = await supabase.from("batches").insert(parsed.data).select("id").single();

  if (error) {
    if (error.code === "23505") return { error: DUPLICATE_NAME_ERROR };
    return { error: "Could not create the batch. Please try again." };
  }

  revalidatePath("/admin/batches");
  redirect(`/admin/batches/${data.id}`);
}

export async function updateBatch(
  batchId: string,
  _prevState: BatchFormState,
  formData: FormData,
): Promise<BatchFormState> {
  await requireAdmin();

  const parsed = parseBatchForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("batches")
    .select("id")
    .eq("name", parsed.data.name)
    .neq("id", batchId)
    .maybeSingle();
  if (existing) return { error: DUPLICATE_NAME_ERROR };

  const { error } = await supabase.from("batches").update(parsed.data).eq("id", batchId);

  if (error) {
    if (error.code === "23505") return { error: DUPLICATE_NAME_ERROR };
    return { error: "Could not save the batch. Please try again." };
  }

  revalidatePath("/admin/batches");
  revalidatePath(`/admin/batches/${batchId}`);
  return { error: null };
}

export async function deleteBatch(batchId: string): Promise<ActionResult> {
  await requireAdmin();

  const supabase = await createClient();

  const { count: assessmentCount } = await supabase
    .from("assessments")
    .select("id", { count: "exact", head: true })
    .eq("batch_id", batchId);

  if (assessmentCount && assessmentCount > 0) return { error: HAS_ASSESSMENTS_ERROR };

  const { error } = await supabase.from("batches").delete().eq("id", batchId);

  if (error) {
    if (error.code === "23503") return { error: HAS_ASSESSMENTS_ERROR };
    return { error: "Could not delete the batch. Please try again." };
  }

  revalidatePath("/admin/batches");
  return { error: null };
}

export async function assignStudentToBatch(batchId: string, studentId: string): Promise<ActionResult> {
  await requireAdmin();

  const supabase = await createClient();

  const student = await getStudentProfile(supabase, studentId);
  if (!student) return { error: NOT_A_STUDENT_ERROR };

  const { error } = await supabase.from("profiles").update({ batch_id: batchId }).eq("id", studentId);
  if (error) return { error: "Could not assign the student. Please try again." };

  revalidatePath(`/admin/batches/${batchId}`);
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath("/admin/students");
  return { error: null };
}

export async function removeStudentFromBatch(batchId: string, studentId: string): Promise<ActionResult> {
  await requireAdmin();

  const supabase = await createClient();

  const student = await getStudentProfile(supabase, studentId);
  if (!student) return { error: NOT_A_STUDENT_ERROR };

  const { error } = await supabase.from("profiles").update({ batch_id: null }).eq("id", studentId);
  if (error) return { error: "Could not remove the student. Please try again." };

  revalidatePath(`/admin/batches/${batchId}`);
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath("/admin/students");
  return { error: null };
}
