"use client";

import { compressImage } from "@/lib/compress-image";
import { sanitizeFilename } from "@/lib/storage-paths";
import { createClient } from "@/lib/supabase/client";

export const QUESTIONS_BUCKET = "questions";

/**
 * Compresses (images only) and uploads one file into the `questions` bucket
 * under `folder` — `{student_id}` for a student's question,
 * `{student_id}/answers` for the admin's answer. Storage RLS decides who may
 * write where. Returns the object path, or null if the upload failed.
 */
export async function uploadQuestionFile(folder: string, file: File): Promise<string | null> {
  const compressed = await compressImage(file);
  const path = `${folder}/${crypto.randomUUID()}-${sanitizeFilename(compressed.name)}`;
  const { error } = await createClient()
    .storage.from(QUESTIONS_BUCKET)
    .upload(path, compressed, { contentType: compressed.type });
  return error ? null : path;
}

/** Best-effort removal of an upload whose question/answer failed to save. */
export async function removeQuestionFile(path: string): Promise<void> {
  await createClient().storage.from(QUESTIONS_BUCKET).remove([path]);
}
