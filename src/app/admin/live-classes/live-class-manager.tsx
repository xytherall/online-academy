"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2Icon, VideoIcon } from "lucide-react";
import { toast } from "sonner";
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
import type { Tables } from "@/lib/supabase/database.types";
import { deleteLiveClass } from "./actions";
import { LiveClassForm } from "./live-class-form";

type LiveClass = Tables<"live_classes">;
type Batch = Pick<Tables<"batches">, "id" | "name">;

function batchLabel(liveClass: LiveClass, batches: Batch[]): string {
  if (!liveClass.batch_id) return "All students";
  return batches.find((b) => b.id === liveClass.batch_id)?.name ?? "Batch";
}

/** `upcoming` and `past` are split on the server so the render doesn't depend on the browser clock. */
export function LiveClassManager({
  upcoming,
  past,
  batches,
}: {
  upcoming: LiveClass[];
  past: LiveClass[];
  batches: Batch[];
}) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Live classes</h1>
          <p className="text-sm text-muted-foreground">
            Students see upcoming classes on their dashboard until an hour after the start time.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button type="button" />}>Add class</DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add class</DialogTitle>
              <DialogDescription>Students it is for are notified when you add it.</DialogDescription>
            </DialogHeader>
            <LiveClassForm mode="create" batches={batches} onDone={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <section>
        <h2 className="mb-3 font-medium">Upcoming</h2>
        {upcoming.length === 0 ? (
          <EmptyState compact icon={VideoIcon} title="No upcoming classes" description="Add one above." />
        ) : (
          <ul className="space-y-2">
            {upcoming.map((liveClass) => (
              <LiveClassRow key={liveClass.id} liveClass={liveClass} batches={batches} />
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 ? (
        <section>
          <h2 className="mb-3 font-medium">Past</h2>
          <ul className="space-y-2">
            {past.map((liveClass) => (
              <LiveClassRow key={liveClass.id} liveClass={liveClass} batches={batches} isPast />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function LiveClassRow({
  liveClass,
  batches,
  isPast = false,
}: {
  liveClass: LiveClass;
  batches: Batch[];
  isPast?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleDelete() {
    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteLiveClass(liveClass.id);
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
            <p className="truncate font-medium">{liveClass.title}</p>
            <Badge variant="outline">{batchLabel(liveClass, batches)}</Badge>
          </div>
          <p className={isPast ? "text-sm text-muted-foreground" : "text-sm"}>
            <LocalDateTime iso={liveClass.starts_at} />
          </p>
          <a
            href={liveClass.join_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-sm text-primary hover:underline"
          >
            {liveClass.join_url}
          </a>
          {liveClass.note ? (
            <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">{liveClass.note}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>Edit</DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit &ldquo;{liveClass.title}&rdquo;</DialogTitle>
              </DialogHeader>
              <LiveClassForm mode="edit" liveClass={liveClass} batches={batches} onDone={() => setEditOpen(false)} />
            </DialogContent>
          </Dialog>

          <Dialog
            open={deleteOpen}
            onOpenChange={(next) => {
              setDeleteOpen(next);
              if (next) setDeleteError(null);
            }}
          >
            <DialogTrigger render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Delete class" />}>
              <Trash2Icon />
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete &ldquo;{liveClass.title}&rdquo;?</DialogTitle>
                <DialogDescription>
                  It disappears from students&rsquo; dashboards and its notifications are removed. This cannot be
                  undone.
                </DialogDescription>
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
