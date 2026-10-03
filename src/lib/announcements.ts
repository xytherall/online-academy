import { resolveSeenCutoff } from "@/lib/announcements-unread";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type AnnouncementWithTarget = Tables<"announcements"> & {
  course: Pick<Tables<"courses">, "id" | "title"> | null;
  batch: Pick<Tables<"batches">, "id" | "name"> | null;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type SeenProfile = Pick<Tables<"profiles">, "id" | "created_at">;

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

/**
 * The cutoff used to decide "New" pills and the unread nav count: the
 * student's stored watermark, or their account creation date if they have
 * never opened the Announcements page yet (so a new student never sees a
 * big unread number for everything posted before they existed).
 */
export async function getAnnouncementSeenCutoff(
  supabase: SupabaseServerClient,
  profile: SeenProfile,
): Promise<string> {
  const { data } = await supabase
    .from("announcement_seen")
    .select("last_seen_at")
    .eq("user_id", profile.id)
    .maybeSingle();

  return resolveSeenCutoff(data, profile.created_at);
}

/**
 * Count of announcements visible to this student (RLS does that filtering)
 * posted after their seen cutoff. Used for the portal nav dot/count.
 */
export async function countUnreadAnnouncements(
  supabase: SupabaseServerClient,
  profile: SeenProfile,
): Promise<number> {
  const cutoff = await getAnnouncementSeenCutoff(supabase, profile);

  const { count, error } = await supabase
    .from("announcements")
    .select("id", { count: "exact", head: true })
    .gt("created_at", cutoff);

  if (error || count === null) return 0;
  return count;
}
