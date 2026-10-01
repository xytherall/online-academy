"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownIcon, ArrowUpIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Input } from "@/components/ui/input";
import type { Tables } from "@/lib/supabase/database.types";
import { deleteResource, getSignedResourceUrl, reorderResource, updateResourceTitle } from "./resource-actions";
import { ResourceForm } from "./resource-form";

type Resource = Tables<"resources">;

export function ResourceManager({ courseId, resources }: { courseId: string; resources: Resource[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-medium">Resources</h2>
        <p className="text-sm text-muted-foreground">
          Files and links attached to this course.
        </p>
      </div>

      {resources.length === 0 ? (
        <EmptyState title="No resources yet" description="Add a file or link below." />
      ) : (
        <ul className="space-y-2">
          {resources.map((resource, index) => (
            <ResourceRow
              key={resource.id}
              courseId={courseId}
              resource={resource}
              isFirst={index === 0}
              isLast={index === resources.length - 1}
            />
          ))}
        </ul>
      )}

      <ResourceForm courseId={courseId} />
    </div>
  );
}

function ResourceRow({
  courseId,
  resource,
  isFirst,
  isLast,
}: {
  courseId: string;
  resource: Resource;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(resource.title);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);

  function handleMove(direction: "up" | "down") {
    setError(null);
    startTransition(async () => {
      const result = await reorderResource(courseId, resource.id, direction);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleSaveTitle() {
    setError(null);
    startTransition(async () => {
      const result = await updateResourceTitle(courseId, resource.id, title);
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success("Saved");
      setIsEditing(false);
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteResource(courseId, resource.id);
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

  async function handleView() {
    setViewError(null);
    const result = await getSignedResourceUrl(resource.id);
    if (result.error || !result.url) {
      setViewError(result.error ?? "Could not open the file.");
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  return (
    <li className="rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
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

        <div className="min-w-0 flex-1">
          {isEditing ? (
            <div className="flex flex-wrap items-center gap-2">
              <Input value={title} onChange={(event) => setTitle(event.target.value)} className="max-w-xs" />
              <Button type="button" size="sm" disabled={isPending} onClick={handleSaveTitle}>
                Save
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => {
                  setTitle(resource.title);
                  setIsEditing(false);
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div>
              <p className="truncate font-medium">{resource.title}</p>
              <p className="text-xs text-muted-foreground">{resource.kind === "file" ? "File" : "Link"}</p>
            </div>
          )}
        </div>

        {!isEditing ? (
          <div className="flex flex-wrap items-center gap-2">
            {resource.kind === "file" ? (
              <Button type="button" variant="outline" size="sm" onClick={handleView}>
                View
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<a href={resource.url ?? "#"} target="_blank" rel="noopener noreferrer" />}
              >
                Open
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              Rename
            </Button>
            <Dialog
              open={deleteOpen}
              onOpenChange={(next) => {
                setDeleteOpen(next);
                if (next) setError(null);
              }}
            >
              <DialogTrigger
                render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Delete resource" />}
              >
                <Trash2Icon />
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete &ldquo;{resource.title}&rdquo;?</DialogTitle>
                  <DialogDescription>This cannot be undone.</DialogDescription>
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
        ) : null}
      </div>

      {error && !deleteOpen ? (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {viewError ? (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>{viewError}</AlertDescription>
        </Alert>
      ) : null}
    </li>
  );
}
