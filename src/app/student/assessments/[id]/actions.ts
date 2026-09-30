"use server";

import { revalidatePath } from "next/cache";
import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MAX_SUBMISSION_FILES } from "@/lib/validation/submissions";

export async function submitAssignment(
  assessmentId: string,
  filePaths: string[],
): Promise<{ error: string | null }> {
  const profile = await requireStudent();
  const supabase = await createClient();

  if (filePaths.length < 1 || filePaths.length > MAX_SUBMISSION_FILES) {
    return { error: "Submit between 1 and 10 files." };
  }

  const prefix = `${assessmentId}/${profile.id}/`;
  if (filePaths.some((path) => !path.startsWith(prefix))) {
    return { error: "Invalid file selection. Please try again." };
  }

  const { error } = await supabase.rpc("submit_assignment", {
    p_assessment_id: assessmentId,
    p_file_paths: filePaths,
  });

  if (error) {
    // Clean up the just-uploaded files. This relies on the student's own
    // "not-yet-submitted" DELETE storage policy, which only allows it while
    // no submission row exists — exactly the case here, since the RPC failed
    // before (or while) inserting one.
    await supabase.storage.from("submissions").remove(filePaths);
    return { error: error.message || "Could not submit. Please try again." };
  }

  revalidatePath(`/student/assessments/${assessmentId}`);
  return { error: null };
}
