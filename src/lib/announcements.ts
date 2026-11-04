import { resolveSeenCutoff } from "@/lib/announcements-unread";
import { postTargetLabel } from "@/lib/post-targets";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type AnnouncementWithTarget = Tables<"announcements"> & {
  announcement_courses: { course: Pick<Tables<"courses">, "id" | "title"> | null }[];
  announcement_batches: { batch: Pick<Tables<"batches">, "id" | "name"> | null }[];
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type SeenProfile = Pick<Tables<"profiles">, "id" | "created_at">;

/**
 * RLS ("Students can read their announcements") already restricts rows to
 * the ones for this student's courses and batch, so this is a plain read — no
 * bulk in-memory filter is needed the way getDueSoonAssessments needs one.
 */
export async function getAnnouncementsForStudent(
  limit?: number,
): Promise<{ announcements: AnnouncementWithTarget[] | null; error: boolean }> {
  const supabase = await createClient();
  let query = supabase
    .from("announcements")
    .select("*, announcement_courses(course:courses(id, title)), announcement_batches(batch:batches(id, name))")
    .order("created_at", { ascending: false });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) return { announcements: null, error: true };
  return { announcements: data, error: false };
}

/**
 * Targets the student can read the names of (courses and batches RLS may hide
 * some, e.g. another batch's name); "All students" when there are none.
 */
export function announcementTargetLabel(
  announcement: Pick<AnnouncementWithTarget, "announcement_courses" | "announcement_batches">,
): string {
  return postTargetLabel(
    announcement.announcement_courses.flatMap(({ course }) => (course ? [course.title] : [])),
    announcement.announcement_batches.flatMap(({ batch }) => (batch ? [batch.name] : [])),
  );
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
