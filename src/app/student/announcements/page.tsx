import { AnnouncementBody } from "@/components/announcement-body";
import { EmptyState } from "@/components/admin/empty-state";
import { LocalDateTime } from "@/components/local-date-time";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { announcementTargetLabel, getAnnouncementsForStudent } from "@/lib/announcements";
import { requireStudent } from "@/lib/auth";

export default async function StudentAnnouncementsPage() {
  await requireStudent();
  const { announcements, error } = await getAnnouncementsForStudent();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Announcements</h1>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>Could not load announcements. Please refresh the page.</AlertDescription>
        </Alert>
      ) : announcements && announcements.length > 0 ? (
        <ul className="space-y-3">
          {announcements.map((announcement) => (
            <li key={announcement.id} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{announcement.title}</p>
                <Badge variant="outline">{announcementTargetLabel(announcement)}</Badge>
              </div>
              <p className="mb-2 text-xs text-muted-foreground">
                <LocalDateTime iso={announcement.created_at} />
              </p>
              <AnnouncementBody body={announcement.body} className="text-sm" />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No announcements yet" description="Announcements from the academy will show up here." />
      )}
    </div>
  );
}
