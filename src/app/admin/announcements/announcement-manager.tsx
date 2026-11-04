"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { AnnouncementBody } from "@/components/announcement-body";
import { EmptyState } from "@/components/empty-state";
import { LocalDateTime } from "@/components/local-date-time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { namesForIds, postTargetLabel } from "@/lib/post-targets";
import type { Tables } from "@/lib/supabase/database.types";
import { deleteAnnouncement } from "./actions";
import { AnnouncementForm } from "./announcement-form";

/** An announcement with the ids it targets (empty = all). */
export type AdminAnnouncement = Tables<"announcements"> & { course_ids: string[]; batch_ids: string[] };
type Course = Pick<Tables<"courses">, "id" | "title">;
type Batch = Pick<Tables<"batches">, "id" | "name">;

function targetLabel(announcement: AdminAnnouncement, courses: Course[], batches: Batch[]): string {
  return postTargetLabel(
    namesForIds(announcement.course_ids, courses, (c) => c.title, "Course"),
    namesForIds(announcement.batch_ids, batches, (b) => b.name, "Batch"),
  );
}

export function AnnouncementManager({
  announcements,
  courses,
  batches,
}: {
  announcements: AdminAnnouncement[];
  courses: Course[];
  batches: Batch[];
}) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-[-0.02em] sm:text-3xl">Announcements</h1>
          <p className="text-sm text-muted-foreground">
            Send to all students, or pick courses and batches.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button type="button" />}>New announcement</DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>New announcement</DialogTitle>
            </DialogHeader>
            <AnnouncementForm
              mode="create"
              courses={courses}
              batches={batches}
              onDone={() => setCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {announcements.length === 0 ? (
        <EmptyState title="No announcements yet" description="Create one above." />
      ) : (
        <ul className="space-y-2">
          {announcements.map((announcement) => (
            <AnnouncementRow
              key={announcement.id}
              announcement={announcement}
              courses={courses}
              batches={batches}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function AnnouncementRow({
  announcement,
  courses,
  batches,
}: {
  announcement: AdminAnnouncement;
  courses: Course[];
  batches: Batch[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleDelete() {
    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteAnnouncement(announcement.id);
      if (result.error) {
        setDeleteError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success("Deleted");
      setDeleteOpen(false);
      router.refresh();
    });
  }

  return (
    <li className="rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium">{announcement.title}</p>
            <Badge variant="outline">{targetLabel(announcement, courses, batches)}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            <LocalDateTime iso={announcement.created_at} />
          </p>
          <AnnouncementBody body={announcement.body} className="mt-2 text-sm" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>Edit</DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit &ldquo;{announcement.title}&rdquo;</DialogTitle>
              </DialogHeader>
              <AnnouncementForm
                mode="edit"
                announcement={announcement}
                courses={courses}
                batches={batches}
                onDone={() => setEditOpen(false)}
              />
            </DialogContent>
          </Dialog>

          <Dialog
            open={deleteOpen}
            onOpenChange={(next) => {
              setDeleteOpen(next);
              if (next) setDeleteError(null);
            }}
          >
            <DialogTrigger
              render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Delete announcement" />}
            >
              <Trash2Icon />
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete &ldquo;{announcement.title}&rdquo;?</DialogTitle>
                <DialogDescription>This cannot be undone.</DialogDescription>
              </DialogHeader>
              {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)} disabled={isPending}>
                  Cancel
                </Button>
                <Button type="button" variant="destructive" onClick={handleDelete} disabled={isPending}>
                  {isPending ? "Deleting…" : "Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </li>
  );
}
