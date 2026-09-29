import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// A route handler (not a server action) so a plain <a target="_blank"> link
// can open it directly — a server action + window.open() after an await gets
// blocked as a popup by mobile browsers.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireStudent();
  const supabase = await createClient();

  const { data: resource } = await supabase
    .from("resources")
    .select("course_id, kind, file_path")
    .eq("id", id)
    .maybeSingle();

  if (!resource || resource.kind !== "file" || !resource.file_path) notFound();

  // Explicit enrollment check, not just a courses/resources RLS pass-through:
  // this is the gate that decides whether a signed URL is even generated.
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("student_id", profile.id)
    .eq("course_id", resource.course_id)
    .maybeSingle();

  if (!enrollment) notFound();

  const { data, error } = await supabase.storage.from("course-files").createSignedUrl(resource.file_path, 60);
  if (error || !data) notFound();

  return NextResponse.redirect(data.signedUrl);
}
