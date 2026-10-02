"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownIcon, ArrowUpIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
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
import { Switch } from "@/components/ui/switch";
import type { Tables } from "@/lib/supabase/database.types";
import { deleteFaq, moveFaq, setFaqPublished } from "./actions";
import { FaqForm } from "./faq-form";

type Faq = Tables<"faqs">;

export function FaqManager({ faqs }: { faqs: Faq[] }) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">FAQ</h1>
          <p className="text-sm text-muted-foreground">
            Shown on the home page in this order. Unpublished questions are never shown.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button type="button" />}>New FAQ</DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>New FAQ</DialogTitle>
            </DialogHeader>
            <FaqForm mode="create" onDone={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {faqs.length === 0 ? (
        <EmptyState title="No FAQs yet" description="Add your first question above." />
      ) : (
        <ul className="space-y-2">
          {faqs.map((faq, index) => (
            <FaqRow
              key={faq.id}
              faq={faq}
              isFirst={index === 0}
              isLast={index === faqs.length - 1}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function FaqRow({ faq, isFirst, isLast }: { faq: Faq; isFirst: boolean; isLast: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleMove(direction: "up" | "down") {
    startTransition(async () => {
      const result = await moveFaq(faq.id, direction);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handlePublishedChange(checked: boolean) {
    startTransition(async () => {
      const result = await setFaqPublished(faq.id, checked);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(checked ? "Published" : "Unpublished");
      router.refresh();
    });
  }

  function handleDelete() {
    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteFaq(faq.id);
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
            <p className="truncate font-medium">{faq.question}</p>
            <Badge variant={faq.is_published ? "default" : "outline"}>
              {faq.is_published ? "Published" : "Unpublished"}
            </Badge>
          </div>
          <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{faq.answer}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Move up"
              disabled={isFirst || isPending}
              onClick={() => handleMove("up")}
            >
              <ArrowUpIcon />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Move down"
              disabled={isLast || isPending}
              onClick={() => handleMove("down")}
            >
              <ArrowDownIcon />
            </Button>
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch
              checked={faq.is_published}
              onCheckedChange={handlePublishedChange}
              disabled={isPending}
              aria-label={faq.is_published ? "Unpublish" : "Publish"}
            />
          </label>

          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>Edit</DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit FAQ</DialogTitle>
              </DialogHeader>
              <FaqForm mode="edit" faq={faq} onDone={() => setEditOpen(false)} />
            </DialogContent>
          </Dialog>

          <Dialog
            open={deleteOpen}
            onOpenChange={(next) => {
              setDeleteOpen(next);
              if (next) setDeleteError(null);
            }}
          >
            <DialogTrigger render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Delete FAQ" />}>
              <Trash2Icon />
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete this FAQ?</DialogTitle>
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
