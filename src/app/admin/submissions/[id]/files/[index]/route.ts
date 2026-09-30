import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Route handler, matching the student equivalent in
// student/submissions/[id]/files/[index]/route.ts.
export async function GET(request: Request, { params }: { params: Promise<{ id: string; index: string }> }) {
  const { id, index } = await params;
  await requireAdmin();
  const supabase = await createClient();

  const { data: submission } = await supabase.from("submissions").select("file_paths").eq("id", id).maybeSingle();

  if (!submission) notFound();

  const fileIndex = Number(index);
  const path = Number.isInteger(fileIndex) ? submission.file_paths[fileIndex] : undefined;
  if (!path) notFound();

  const { data, error } = await supabase.storage.from("submissions").createSignedUrl(path, 60);
  if (error || !data) notFound();

  return NextResponse.redirect(data.signedUrl);
}
