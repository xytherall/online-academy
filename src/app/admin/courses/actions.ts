"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { courseSchema } from "@/lib/validation/courses";

export type CourseFormState = { error: string | null; success?: boolean };

const DUPLICATE_SLUG_ERROR = "A course with this slug already exists. Choose a different slug.";
const HAS_RESOURCES_ERROR =
  "This course has resources. Delete them first, or unpublish the course instead.";
const HAS_ENROLLMENTS_ERROR =
  "This course has enrolled students. Remove their enrollments first, or unpublish the course instead.";
const HAS_ASSESSMENTS_ERROR =
  "This course has assessments. Delete them first, or unpublish the course instead.";

/** Publishing, unpublishing, editing or deleting a course all change what the public site shows. */
function revalidatePublicCoursePaths(...slugs: (string | null | undefined)[]) {
  revalidatePath("/");
  revalidatePath("/courses");
  for (const slug of slugs) {
    if (slug) revalidatePath(`/courses/${slug}`);
  }
}

function parseCourseForm(formData: FormData) {
  return courseSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    level: formData.get("level"),
    description: formData.get("description"),
    is_published: formData.get("is_published"),
  });
}

export async function createCourse(
  _prevState: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  await requireAdmin();

  const parsed = parseCourseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("courses")
    .select("id")
    .eq("slug", parsed.data.slug)
    .maybeSingle();
  if (existing) return { error: DUPLICATE_SLUG_ERROR };

  const { data, error } = await supabase.from("courses").insert(parsed.data).select("id").single();

  if (error) {
    if (error.code === "23505") return { error: DUPLICATE_SLUG_ERROR };
    return { error: "Could not create the course. Please try again." };
  }

  revalidatePath("/admin/courses");
  revalidatePublicCoursePaths(parsed.data.slug);
  redirect(`/admin/courses/${data.id}`);
}

export async function updateCourse(
  courseId: string,
  _prevState: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  await requireAdmin();

  const parsed = parseCourseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const supabase = await createClient();

  const { data: current } = await supabase
    .from("courses")
    .select("slug")
    .eq("id", courseId)
    .maybeSingle();

  const { data: existing } = await supabase
    .from("courses")
    .select("id")
    .eq("slug", parsed.data.slug)
    .neq("id", courseId)
    .maybeSingle();
  if (existing) return { error: DUPLICATE_SLUG_ERROR };

  const { error } = await supabase.from("courses").update(parsed.data).eq("id", courseId);

  if (error) {
    if (error.code === "23505") return { error: DUPLICATE_SLUG_ERROR };
    return { error: "Could not save the course. Please try again." };
  }

  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePublicCoursePaths(current?.slug, parsed.data.slug);
  return { error: null, success: true };
}

export async function deleteCourse(courseId: string): Promise<{ error: string | null }> {
  await requireAdmin();

  const supabase = await createClient();

  const { data: current } = await supabase
    .from("courses")
    .select("slug")
    .eq("id", courseId)
    .maybeSingle();

  const { count: resourceCount } = await supabase
    .from("resources")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId);

  if (resourceCount && resourceCount > 0) return { error: HAS_RESOURCES_ERROR };

  const { count: enrollmentCount } = await supabase
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId);

  if (enrollmentCount && enrollmentCount > 0) return { error: HAS_ENROLLMENTS_ERROR };

  const { count: assessmentCount } = await supabase
    .from("assessments")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId);

  if (assessmentCount && assessmentCount > 0) return { error: HAS_ASSESSMENTS_ERROR };

  const { error } = await supabase.from("courses").delete().eq("id", courseId);

  if (error) {
    if (error.code === "23503") return { error: HAS_ENROLLMENTS_ERROR };
    return { error: "Could not delete the course. Please try again." };
  }

  revalidatePath("/admin/courses");
  revalidatePublicCoursePaths(current?.slug);
  return { error: null };
}
