"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  fileResourceMetaSchema,
  linkResourceSchema,
  resourceTitleUpdateSchema,
} from "@/lib/validation/resources";

export type ResourceActionResult = { error: string | null };
export type CreateLinkResourceState = { error: string | null; success: boolean };

async function nextSortOrder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  courseId: string,
): Promise<number> {
  const { data } = await supabase
    .from("resources")
    .select("sort_order")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.sort_order ?? -1) + 1;
}

export async function createLinkResource(
  courseId: string,
  _prevState: CreateLinkResourceState,
  formData: FormData,
): Promise<CreateLinkResourceState> {
  await requireAdmin();

  const parsed = linkResourceSchema.safeParse({
    title: formData.get("title"),
    kind: "link",
    url: formData.get("url"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Please check the form and try again.",
      success: false,
    };
  }

  const supabase = await createClient();
  const sortOrder = await nextSortOrder(supabase, courseId);

  const { error } = await supabase.from("resources").insert({
    course_id: courseId,
    title: parsed.data.title,
    kind: "link",
    url: parsed.data.url,
    sort_order: sortOrder,
  });

  if (error) return { error: "Could not add the resource. Please try again.", success: false };

  revalidatePath(`/admin/courses/${courseId}`);
  return { error: null, success: true };
}

export async function createFileResource(
  courseId: string,
  input: { title: string; file_path: string },
): Promise<ResourceActionResult> {
  await requireAdmin();

  const parsed = fileResourceMetaSchema.safeParse({
    title: input.title,
    kind: "file",
    file_path: input.file_path,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const supabase = await createClient();
  const sortOrder = await nextSortOrder(supabase, courseId);

  const { error } = await supabase.from("resources").insert({
    course_id: courseId,
    title: parsed.data.title,
    kind: "file",
    file_path: parsed.data.file_path,
    sort_order: sortOrder,
  });

  if (error) {
    // The file already made it into storage; clean it up so a failed
    // metadata write doesn't leave an orphaned object behind.
    await supabase.storage.from("course-files").remove([parsed.data.file_path]);
    return { error: "Could not add the resource. Please try again." };
  }

  revalidatePath(`/admin/courses/${courseId}`);
  return { error: null };
}

export async function updateResourceTitle(
  courseId: string,
  resourceId: string,
  title: string,
): Promise<ResourceActionResult> {
  await requireAdmin();

  const parsed = resourceTitleUpdateSchema.safeParse({ title });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the title and try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("resources")
    .update({ title: parsed.data.title })
    .eq("id", resourceId)
    .eq("course_id", courseId);

  if (error) return { error: "Could not save the title. Please try again." };

  revalidatePath(`/admin/courses/${courseId}`);
  return { error: null };
}

export async function deleteResource(courseId: string, resourceId: string): Promise<ResourceActionResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { data: resource, error: fetchError } = await supabase
    .from("resources")
    .select("kind, file_path")
    .eq("id", resourceId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (fetchError || !resource) return { error: "Resource not found." };

  // Storage delete first: it's safe to retry, so nothing is left orphaned if
  // the row delete below fails afterwards.
  if (resource.kind === "file" && resource.file_path) {
    const { error: storageError } = await supabase.storage
      .from("course-files")
      .remove([resource.file_path]);
    if (storageError) return { error: "Could not delete the file. Please try again." };
  }

  const { error } = await supabase.from("resources").delete().eq("id", resourceId).eq("course_id", courseId);
  if (error) return { error: "Could not delete the resource. Please try again." };

  revalidatePath(`/admin/courses/${courseId}`);
  return { error: null };
}

export async function reorderResource(
  courseId: string,
  resourceId: string,
  direction: "up" | "down",
): Promise<ResourceActionResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { data: resources, error } = await supabase
    .from("resources")
    .select("id, sort_order")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });

  if (error || !resources) return { error: "Could not reorder resources. Please try again." };

  const index = resources.findIndex((resource) => resource.id === resourceId);
  if (index === -1) return { error: "Resource not found." };

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= resources.length) return { error: null };

  const current = resources[index];
  const swap = resources[swapIndex];

  const { error: firstError } = await supabase
    .from("resources")
    .update({ sort_order: swap.sort_order })
    .eq("id", current.id);
  const { error: secondError } = await supabase
    .from("resources")
    .update({ sort_order: current.sort_order })
    .eq("id", swap.id);

  if (firstError || secondError) return { error: "Could not reorder resources. Please try again." };

  revalidatePath(`/admin/courses/${courseId}`);
  return { error: null };
}

export async function getSignedResourceUrl(
  resourceId: string,
): Promise<{ url: string | null; error: string | null }> {
  await requireAdmin();

  const supabase = await createClient();
  const { data: resource, error: fetchError } = await supabase
    .from("resources")
    .select("file_path")
    .eq("id", resourceId)
    .maybeSingle();

  if (fetchError || !resource?.file_path) return { url: null, error: "File not found." };

  const { data, error } = await supabase.storage.from("course-files").createSignedUrl(resource.file_path, 60);

  if (error || !data) return { url: null, error: "Could not open the file. Please try again." };

  return { url: data.signedUrl, error: null };
}
