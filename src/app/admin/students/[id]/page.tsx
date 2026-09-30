import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/server";
import { BatchReassignSelect } from "./batch-reassign-select";
import { StudentEnrollmentsManager } from "./student-enrollments-manager";
import { StudentProfileForm } from "./student-profile-form";
import { StudentStatusActions } from "./student-status-actions";

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: student, error: studentError },
    { data: batches, error: batchesError },
    { data: enrollments, error: enrollmentsError },
    { data: allCourses, error: coursesError },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).eq("role", "student").maybeSingle(),
    supabase.from("batches").select("id, name").order("name"),
    supabase
      .from("enrollments")
      .select(
        "id, remarks, effort_rating, participation_rating, strengths, areas_to_improve, courses(id, title, level)",
      )
      .eq("student_id", id)
      .order("created_at"),
    supabase.from("courses").select("id, title, level").order("level").order("title"),
  ]);

  if (studentError) {
    return <p className="text-sm text-destructive">Could not load this student. Please refresh the page.</p>;
  }
  if (!student) notFound();

  const enrolledCourseIds = new Set((enrollments ?? []).map((e) => e.courses?.id).filter(Boolean));
  const availableCourses = (allCourses ?? []).filter((course) => !enrolledCourseIds.has(course.id));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">
            {student.full_name?.trim() ? student.full_name : student.email}
          </h1>
          <p className="text-sm text-muted-foreground">{student.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={student.is_active ? "default" : "secondary"}>
            {student.is_active ? "Active" : "Deactivated"}
          </Badge>
          <StudentStatusActions studentId={student.id} isActive={student.is_active} />
        </div>
      </div>

      <StudentProfileForm student={student} />

      <div className="max-w-xl space-y-2">
        <p className="text-sm font-medium">Batch</p>
        {batchesError ? (
          <p className="text-sm text-destructive">Could not load batches. Please refresh the page.</p>
        ) : (
          <BatchReassignSelect studentId={student.id} batches={batches ?? []} currentBatchId={student.batch_id} />
        )}
      </div>

      <Separator />

      {enrollmentsError || coursesError ? (
        <p className="text-sm text-destructive">Could not load enrollments. Please refresh the page.</p>
      ) : (
        <StudentEnrollmentsManager
          studentId={student.id}
          enrollments={(enrollments ?? [])
            .filter((e) => e.courses)
            .map((e) => ({
              id: e.id,
              remarks: e.remarks,
              effort_rating: e.effort_rating,
              participation_rating: e.participation_rating,
              strengths: e.strengths,
              areas_to_improve: e.areas_to_improve,
              course: e.courses!,
            }))}
          availableCourses={availableCourses}
        />
      )}
    </div>
  );
}
