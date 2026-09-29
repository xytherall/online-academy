import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { getVisibleAssessmentForStudent } from "@/lib/assessments";
import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// A route handler (not a server action) so a plain <a target="_blank"> link
// can open it directly — a server action + window.open() after an await gets
// blocked as a popup by mobile browsers. Mirrors /student/resources/[id].
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireStudent();
  const supabase = await createClient();

  const assessment = await getVisibleAssessmentForStudent(supabase, profile.id, id);
  if (!assessment || !assessment.attachment_path) notFound();

  const { data, error } = await supabase.storage
    .from("course-files")
    .createSignedUrl(assessment.attachment_path, 60);
  if (error || !data) notFound();

  return NextResponse.redirect(data.signedUrl);
}
