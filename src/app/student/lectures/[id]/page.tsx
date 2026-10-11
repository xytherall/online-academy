import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { z } from "zod";
import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDuration, fromStoredVimeoId, vimeoEmbedUrl } from "@/lib/vimeo";

export const metadata: Metadata = { title: "Lecture" };

export default async function StudentLecturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireStudent();

  if (!z.uuid().safeParse(id).success) notFound();

  // RLS ("Students can read shown lectures of their enrolled courses") only
  // returns a shown lecture of a course this active student is enrolled in,
  // so a hidden, other-course or unknown lecture all come back empty.
  const supabase = await createClient();
  const { data: lecture, error } = await supabase
    .from("lectures")
    .select("id, title, description, vimeo_id, duration_seconds, course:courses(id, title)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return <p className="text-sm text-destructive">Could not load this lecture. Please refresh the page.</p>;
  }
  const video = lecture ? fromStoredVimeoId(lecture.vimeo_id) : null;
  if (!lecture || !video) notFound();

  const duration = formatDuration(lecture.duration_seconds);

  return (
    <div className="space-y-4">
      {lecture.course ? (
        <Link
          href={`/student/courses/${lecture.course.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
          {lecture.course.title}
        </Link>
      ) : null}

      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
        <iframe
          src={vimeoEmbedUrl(video)}
          title={lecture.title}
          className="absolute inset-0 size-full"
          allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>

      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{lecture.title}</h1>
        {duration ? <p className="text-sm text-muted-foreground">{duration}</p> : null}
      </div>

      {lecture.description ? (
        <p className="whitespace-pre-line text-sm text-muted-foreground">{lecture.description}</p>
      ) : null}
    </div>
  );
}
