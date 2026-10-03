import type { Metadata } from "next";
import { AnnouncementBody } from "@/components/announcement-body";
import { EmptyState } from "@/components/empty-state";
import { LocalDateTime } from "@/components/local-date-time";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  announcementTargetLabel,
  getAnnouncementSeenCutoff,
  getAnnouncementsForStudent,
} from "@/lib/announcements";
import { isNew } from "@/lib/announcements-unread";
import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MarkSeenOnMount } from "./mark-seen-on-mount";

export const metadata: Metadata = { title: "Announcements" };

export default async function StudentAnnouncementsPage() {
  const profile = await requireStudent();
  const supabase = await createClient();

  // Read the cutoff before it gets updated, so "New" pills reflect what was
  // unseen when this visit started, not after MarkSeenOnMount runs.
  const [cutoff, { announcements, error }] = await Promise.all([
    getAnnouncementSeenCutoff(supabase, profile),
    getAnnouncementsForStudent(),
  ]);

  return (
    <div className="space-y-6">
      <MarkSeenOnMount />
      <h1 className="text-xl font-semibold">Announcements</h1>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>Could not load announcements. Please refresh the page.</AlertDescription>
        </Alert>
      ) : announcements && announcements.length > 0 ? (
        <ul className="space-y-3">
          {announcements.map((announcement) => (
            <li key={announcement.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{announcement.title}</p>
                <Badge variant="outline">{announcementTargetLabel(announcement)}</Badge>
                {isNew(announcement.created_at, cutoff) ? <Badge variant="info">New</Badge> : null}
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
