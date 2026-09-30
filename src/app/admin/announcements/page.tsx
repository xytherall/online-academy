import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/server";
import { AnnouncementManager } from "./announcement-manager";

export default async function AdminAnnouncementsPage() {
  const supabase = await createClient();
  const [{ data: announcements, error }, { data: courses }, { data: batches }] = await Promise.all([
    supabase.from("announcements").select("*").order("created_at", { ascending: false }),
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

  return (
    <AnnouncementManager announcements={announcements ?? []} courses={courses ?? []} batches={batches ?? []} />
  );
}
