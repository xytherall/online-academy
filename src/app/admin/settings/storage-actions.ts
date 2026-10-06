"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ClearFilesResult = { error: string | null; removed: number };

/** Storage's remove() takes a list; keep each request a sensible size. */
const REMOVE_BATCH_SIZE = 100;

/**
 * Removes the uploaded files of every submission that has already been
 * marked. clear_marked_submission_files() empties file_paths only on marked
 * rows (checked in the same SQL statement) and returns those paths; only
 * those are deleted from Storage. Marks, feedback and the late flag are
 * never touched. Started only by an admin pressing the button.
 */
export async function clearMarkedSubmissionFiles(): Promise<ClearFilesResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: paths, error } = await supabase.rpc("clear_marked_submission_files");
  if (error) return { error: "Could not clear the files. Nothing was removed. Please try again.", removed: 0 };

  let removed = 0;
  let failed = 0;
  for (let i = 0; i < paths.length; i += REMOVE_BATCH_SIZE) {
    const batch = paths.slice(i, i + REMOVE_BATCH_SIZE);
    const { data, error: removeError } = await supabase.storage.from("submissions").remove(batch);
    if (removeError) {
      console.error("Could not remove marked submission files:", removeError.message);
      failed += batch.length;
    } else {
      removed += data.length;
    }
  }

  revalidatePath("/admin", "layout");
  revalidatePath("/student", "layout");

  if (failed > 0) {
    return {
      error: `${removed} file${removed === 1 ? "" : "s"} removed, but ${failed} could not be deleted from storage.`,
      removed,
    };
  }
  return { error: null, removed };
}
