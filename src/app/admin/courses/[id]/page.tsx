import { notFound } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/server";
import { CourseForm } from "../course-form";
import { ResourceManager } from "./resource-manager";

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: course, error: courseError }, { data: resources, error: resourcesError }] =
    await Promise.all([
      supabase.from("courses").select("*").eq("id", id).maybeSingle(),
      supabase.from("resources").select("*").eq("course_id", id).order("sort_order", { ascending: true }),
    ]);

  if (courseError) {
    return <p className="text-sm text-destructive">Could not load this course. Please refresh the page.</p>;
  }
  if (!course) notFound();

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">{course.title}</h1>

      <CourseForm mode="edit" course={course} />

      <Separator />

      {resourcesError ? (
        <p className="text-sm text-destructive">Could not load resources. Please refresh the page.</p>
      ) : (
        <ResourceManager courseId={course.id} resources={resources ?? []} />
      )}
    </div>
  );
}
