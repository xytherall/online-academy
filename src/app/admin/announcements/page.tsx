import type { Metadata } from "next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/server";
import { AnnouncementManager, type AdminAnnouncement } from "./announcement-manager";

export const metadata: Metadata = { title: "Announcements" };

export default async function AdminAnnouncementsPage() {
  const supabase = await createClient();
  const [{ data: announcements, error }, { data: courses }, { data: batches }] = await Promise.all([
    supabase
      .from("announcements")
      .select("*, announcement_courses(course_id), announcement_batches(batch_id)")
      .order("created_at", { ascending: false }),
    supabase.from("courses").select("id, title").order("title"),
    supabase.from("batches").select("id, name").order("name"),
  ]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Could not load announcements. Please refresh the page.</AlertDescription>
      </Alert>
    );
  }

  const rows: AdminAnnouncement[] = (announcements ?? []).map(
    ({ announcement_courses, announcement_batches, ...announcement }) => ({
      ...announcement,
      course_ids: announcement_courses.map((row) => row.course_id),
      batch_ids: announcement_batches.map((row) => row.batch_id),
    }),
  );

  return <AnnouncementManager announcements={rows} courses={courses ?? []} batches={batches ?? []} />;
}
