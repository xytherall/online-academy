import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type AnnouncementWithTarget = Tables<"announcements"> & {
  course: Pick<Tables<"courses">, "id" | "title"> | null;
  batch: Pick<Tables<"batches">, "id" | "name"> | null;
};

/**
 * RLS ("Students can read their announcements") already restricts rows to
 * everyone/their enrolled courses/their batch, so this is a plain read — no
 * bulk in-memory filter is needed the way getDueSoonAssessments needs one.
 */
export async function getAnnouncementsForStudent(
  limit?: number,
): Promise<{ announcements: AnnouncementWithTarget[] | null; error: boolean }> {
  const supabase = await createClient();
  let query = supabase
    .from("announcements")
    .select("*, course:courses(id, title), batch:batches(id, name)")
    .order("created_at", { ascending: false });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) return { announcements: null, error: true };
  return { announcements: data, error: false };
}

export function announcementTargetLabel(announcement: Pick<AnnouncementWithTarget, "course" | "batch">): string {
  if (announcement.course) return announcement.course.title;
  if (announcement.batch) return announcement.batch.name;
  return "Everyone";
}
