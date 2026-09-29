import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type EnrolledCourse = Pick<Tables<"courses">, "id" | "title" | "level">;

/**
 * Enrolled courses only. Querying `courses` directly would also surface every
 * published course to any authenticated student (that policy exists for the
 * public site), so this goes through the student's own enrollment rows.
 */
export async function getEnrolledCourses(
  studentId: string,
): Promise<{ courses: EnrolledCourse[] | null; error: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("enrollments")
    .select("course:courses(id, title, level)")
    .eq("student_id", studentId)
    .order("created_at", { ascending: true });

  if (error) return { courses: null, error: true };

  const courses = data
    .map((row) => row.course)
    .filter((course): course is EnrolledCourse => course !== null);

  return { courses, error: false };
}

export async function getBatchName(batchId: string | null): Promise<string | null> {
  if (!batchId) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("batches").select("name").eq("id", batchId).maybeSingle();
  return data?.name ?? null;
}
