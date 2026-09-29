import { notFound } from "next/navigation";
import { FileTextIcon, LinkIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/admin/empty-state";
import { Separator } from "@/components/ui/separator";
import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function StudentCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireStudent();
  const supabase = await createClient();

  // Enrollment is checked explicitly rather than relying on the courses
  // table's own RLS: that policy also lets any authenticated student read a
  // *published* course they are not enrolled in (it backs the public site),
  // so a courses-only lookup would leak the course's existence here.
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("student_id", profile.id)
    .eq("course_id", id)
    .maybeSingle();

  if (!enrollment) notFound();

  const [{ data: course, error: courseError }, { data: resources, error: resourcesError }] = await Promise.all([
    supabase.from("courses").select("*").eq("id", id).maybeSingle(),
    supabase.from("resources").select("*").eq("course_id", id).order("sort_order", { ascending: true }),
  ]);

  if (courseError) {
    return <p className="text-sm text-destructive">Could not load this course. Please refresh the page.</p>;
  }
  if (!course) notFound();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold">{course.title}</h1>
          <Badge variant="secondary">{course.level} Level</Badge>
        </div>
        {course.description ? (
          <p className="whitespace-pre-line text-sm text-muted-foreground">{course.description}</p>
        ) : null}
      </div>

      <Separator />

      <div className="space-y-4">
        <h2 className="font-medium">Resources</h2>

        {resourcesError ? (
          <Alert variant="destructive">
            <AlertDescription>Could not load resources. Please refresh the page.</AlertDescription>
          </Alert>
        ) : resources && resources.length > 0 ? (
          <ul className="space-y-2">
            {resources.map((resource) => (
              <li key={resource.id} className="rounded-lg border border-border p-3">
                <a
                  href={
                    resource.kind === "file" ? `/student/resources/${resource.id}` : (resource.url ?? "#")
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 font-medium hover:underline"
                >
                  {resource.kind === "file" ? (
                    <FileTextIcon className="size-4 shrink-0" />
                  ) : (
                    <LinkIcon className="size-4 shrink-0" />
                  )}
                  {resource.title}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No resources yet" description="Check back later." />
        )}
      </div>
    </div>
  );
}
