"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownIcon, ArrowUpIcon, MonitorPlayIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { LectureThumbnail } from "@/components/lecture-thumbnail";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import type { Tables } from "@/lib/supabase/database.types";
import { formatDuration } from "@/lib/vimeo";
import { deleteLecture, reorderLecture } from "./lecture-actions";
import { LectureForm } from "./lecture-form";

type Lecture = Tables<"lectures">;

export function LectureManager({ courseId, lectures }: { courseId: string; lectures: Lecture[] }) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-medium">Recorded lectures</h2>
          <p className="text-sm text-muted-foreground">
            Vimeo videos for this course. Students only see the ones that are shown.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button type="button" variant="outline" />}>Add lecture</DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add lecture</DialogTitle>
              <DialogDescription>Paste the video&rsquo;s Vimeo link.</DialogDescription>
            </DialogHeader>
            <LectureForm mode="create" courseId={courseId} onDone={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {lectures.length === 0 ? (
        <EmptyState compact icon={MonitorPlayIcon} title="No recorded lectures yet" description="Add one above." />
      ) : (
        <ul className="space-y-2">
          {lectures.map((lecture, index) => (
            <LectureRow
              key={lecture.id}
              courseId={courseId}
              lecture={lecture}
              isFirst={index === 0}
              isLast={index === lectures.length - 1}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function LectureRow({
  courseId,
  lecture,
  isFirst,
  isLast,
}: {
  courseId: string;
  lecture: Lecture;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const duration = formatDuration(lecture.duration_seconds);

  function handleMove(direction: "up" | "down") {
    setError(null);
    startTransition(async () => {
      const result = await reorderLecture(courseId, lecture.id, direction);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteLecture(courseId, lecture.id);
      if (result.error) {
        setError(result.error);
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
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={isFirst || isPending}
            onClick={() => handleMove("up")}
            aria-label="Move up"
          >
            <ArrowUpIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={isLast || isPending}
            onClick={() => handleMove("down")}
            aria-label="Move down"
          >
            <ArrowDownIcon />
          </Button>
        </div>

        <LectureThumbnail url={lecture.thumbnail_url} className="w-24" />

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{lecture.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant={lecture.is_published ? "secondary" : "outline"}>
              {lecture.is_published ? "Shown" : "Hidden"}
            </Badge>
            {duration ? <span className="text-xs text-muted-foreground">{duration}</span> : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>Edit</DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit &ldquo;{lecture.title}&rdquo;</DialogTitle>
              </DialogHeader>
              <LectureForm mode="edit" courseId={courseId} lecture={lecture} onDone={() => setEditOpen(false)} />
            </DialogContent>
          </Dialog>

          <Dialog
            open={deleteOpen}
            onOpenChange={(next) => {
              setDeleteOpen(next);
              if (next) setError(null);
            }}
          >
            <DialogTrigger
              render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Delete lecture" />}
            >
              <Trash2Icon />
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete &ldquo;{lecture.title}&rdquo;?</DialogTitle>
                <DialogDescription>
                  It is removed from this site and its notifications are removed. The video stays on Vimeo.
                </DialogDescription>
              </DialogHeader>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
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

      {error && !deleteOpen ? (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </li>
  );
}
