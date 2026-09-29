import { notFound } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/server";
import { CourseForm } from "../course-form";
import { AssessmentManager } from "./assessment-manager";
import { ResourceManager } from "./resource-manager";

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: course, error: courseError },
    { data: resources, error: resourcesError },
    { data: assessments, error: assessmentsError },
    { data: batches, error: batchesError },
  ] = await Promise.all([
    supabase.from("courses").select("*").eq("id", id).maybeSingle(),
    supabase.from("resources").select("*").eq("course_id", id).order("sort_order", { ascending: true }),
    supabase.from("assessments").select("*").eq("course_id", id).order("due_at", { ascending: true }),
    supabase.from("batches").select("id, name").order("name", { ascending: true }),
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

      <Separator />

      {assessmentsError || batchesError ? (
        <p className="text-sm text-destructive">Could not load assessments. Please refresh the page.</p>
      ) : (
        <AssessmentManager courseId={course.id} assessments={assessments ?? []} batches={batches ?? []} />
      )}
    </div>
  );
}
