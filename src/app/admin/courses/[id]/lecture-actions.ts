"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { notifyLectureShown } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";
import { lectureSchema } from "@/lib/validation/lectures";
import { fromStoredVimeoId } from "@/lib/vimeo";
import { fetchVimeoDetails, type VimeoDetails } from "@/lib/vimeo-oembed";

export type LectureFormState = { error: string | null; success: boolean };
export type LectureActionResult = { error: string | null };

const idSchema = z.uuid();

function parseLectureForm(formData: FormData) {
  return lectureSchema.safeParse({
    title: formData.get("title"),
    vimeo_url: formData.get("vimeo_url"),
    description: formData.get("description"),
    is_published: formData.get("is_published"),
  });
}

function revalidateLectures(courseId: string, lectureId?: string) {
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath(`/student/courses/${courseId}`);
  if (lectureId) revalidatePath(`/student/lectures/${lectureId}`);
}

async function lookUpDetails(vimeoId: string): Promise<VimeoDetails> {
  const video = fromStoredVimeoId(vimeoId);
  return video ? fetchVimeoDetails(video) : { duration_seconds: null, thumbnail_url: null };
}

async function nextSortOrder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  courseId: string,
): Promise<number> {
  const { data } = await supabase
    .from("lectures")
    .select("sort_order")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.sort_order ?? -1) + 1;
}

export async function createLecture(
  courseId: string,
  _prevState: LectureFormState,
  formData: FormData,
): Promise<LectureFormState> {
  await requireAdmin();

  if (!idSchema.safeParse(courseId).success) return { error: "Course not found.", success: false };

  const parsed = parseLectureForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again.", success: false };
  }

  const supabase = await createClient();
  const [details, sortOrder] = await Promise.all([
    lookUpDetails(parsed.data.vimeo_url),
    nextSortOrder(supabase, courseId),
  ]);

  const { data: created, error } = await supabase
    .from("lectures")
    .insert({
      course_id: courseId,
      title: parsed.data.title,
      description: parsed.data.description,
      vimeo_id: parsed.data.vimeo_url,
      is_published: parsed.data.is_published,
      sort_order: sortOrder,
      ...details,
    })
    .select("id")
    .single();

  if (error) return { error: "Could not add the lecture. Please try again.", success: false };

  if (parsed.data.is_published) await notifyLectureShown(supabase, created.id);

  revalidateLectures(courseId, created.id);
  return { error: null, success: true };
}

/** Notifies only if this is the first time the lecture is shown (see notifyLectureShown). */
export async function updateLecture(
  courseId: string,
  lectureId: string,
  _prevState: LectureFormState,
  formData: FormData,
): Promise<LectureFormState> {
  await requireAdmin();

  if (!idSchema.safeParse(courseId).success || !idSchema.safeParse(lectureId).success) {
    return { error: "Lecture not found.", success: false };
  }

  const parsed = parseLectureForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again.", success: false };
  }

  const supabase = await createClient();
  const { data: current, error: fetchError } = await supabase
    .from("lectures")
    .select("vimeo_id, duration_seconds, thumbnail_url")
    .eq("id", lectureId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (fetchError) return { error: "Could not save the lecture. Please try again.", success: false };
  if (!current) return { error: "Lecture not found.", success: false };

  // Ask Vimeo again only when the video changed, or when it gave nothing last time.
  const needsLookup =
    current.vimeo_id !== parsed.data.vimeo_url ||
    (current.duration_seconds === null && current.thumbnail_url === null);
  const details = needsLookup
    ? await lookUpDetails(parsed.data.vimeo_url)
    : { duration_seconds: current.duration_seconds, thumbnail_url: current.thumbnail_url };

  const { error } = await supabase
    .from("lectures")
    .update({
      title: parsed.data.title,
      description: parsed.data.description,
      vimeo_id: parsed.data.vimeo_url,
      is_published: parsed.data.is_published,
      ...details,
    })
    .eq("id", lectureId)
    .eq("course_id", courseId);

  if (error) return { error: "Could not save the lecture. Please try again.", success: false };

  if (parsed.data.is_published) await notifyLectureShown(supabase, lectureId);

  revalidateLectures(courseId, lectureId);
  return { error: null, success: true };
}

/** Removes the lecture from the site only; the video stays on Vimeo. */
export async function deleteLecture(courseId: string, lectureId: string): Promise<LectureActionResult> {
  await requireAdmin();

  if (!idSchema.safeParse(courseId).success || !idSchema.safeParse(lectureId).success) {
    return { error: "Lecture not found." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("lectures").delete().eq("id", lectureId).eq("course_id", courseId);
  if (error) return { error: "Could not delete the lecture. Please try again." };

  revalidateLectures(courseId, lectureId);
  return { error: null };
}

export async function reorderLecture(
  courseId: string,
  lectureId: string,
  direction: "up" | "down",
): Promise<LectureActionResult> {
  await requireAdmin();

  if (
    !idSchema.safeParse(courseId).success ||
    !idSchema.safeParse(lectureId).success ||
    (direction !== "up" && direction !== "down")
  ) {
    return { error: "Lecture not found." };
  }

  const supabase = await createClient();
  const { data: lectures, error } = await supabase
    .from("lectures")
    .select("id, sort_order")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !lectures) return { error: "Could not reorder lectures. Please try again." };

  const index = lectures.findIndex((lecture) => lecture.id === lectureId);
  if (index === -1) return { error: "Lecture not found." };

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= lectures.length) return { error: null };

  const current = lectures[index];
  const swap = lectures[swapIndex];

  const { error: firstError } = await supabase
    .from("lectures")
    .update({ sort_order: swap.sort_order })
    .eq("id", current.id);
  const { error: secondError } = await supabase
    .from("lectures")
    .update({ sort_order: current.sort_order })
    .eq("id", swap.id);

  if (firstError || secondError) return { error: "Could not reorder lectures. Please try again." };

  revalidateLectures(courseId);
  return { error: null };
}
