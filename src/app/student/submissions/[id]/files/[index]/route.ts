import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// A route handler (not a server action), matching the Stage 5 pattern in
// student/resources/[id]/route.ts — a server action + window.open() after an
// await gets blocked as a popup by mobile browsers.
export async function GET(request: Request, { params }: { params: Promise<{ id: string; index: string }> }) {
  const { id, index } = await params;
  const profile = await requireStudent();
  const supabase = await createClient();

  const { data: submission } = await supabase
    .from("submissions")
    .select("student_id, file_paths")
    .eq("id", id)
    .maybeSingle();

  if (!submission || submission.student_id !== profile.id) notFound();

  const fileIndex = Number(index);
  const path = Number.isInteger(fileIndex) ? submission.file_paths[fileIndex] : undefined;
  if (!path) notFound();

  const { data, error } = await supabase.storage.from("submissions").createSignedUrl(path, 60);
  if (error || !data) notFound();

  return NextResponse.redirect(data.signedUrl);
}
