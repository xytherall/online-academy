import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { requireStudent } from "@/lib/auth";
import { questionFilePath } from "@/lib/questions";
import { createClient } from "@/lib/supabase/server";

// Route handler, matching student/submissions/[id]/files/[index]/route.ts.
export async function GET(request: Request, { params }: { params: Promise<{ id: string; which: string }> }) {
  const { id, which } = await params;
  const profile = await requireStudent();
  const supabase = await createClient();

  const { data: question } = await supabase
    .from("questions")
    .select("student_id, attachment_path, answer_attachment_path")
    .eq("id", id)
    .maybeSingle();

  if (!question || question.student_id !== profile.id) notFound();

  const path = questionFilePath(question, which);
  if (!path) notFound();

  const { data, error } = await supabase.storage.from("questions").createSignedUrl(path, 60);
  if (error || !data) notFound();

  return NextResponse.redirect(data.signedUrl);
}
