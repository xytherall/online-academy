import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { SectionTabs } from "@/components/portal/section-tabs";
import { Badge } from "@/components/ui/badge";
import { displayName } from "@/lib/display-name";
import { createClient } from "@/lib/supabase/server";
import { BatchReassignSelect } from "./batch-reassign-select";
import { StudentEnrollmentsManager } from "./student-enrollments-manager";
import { StudentProfileForm } from "./student-profile-form";

export const metadata: Metadata = { title: "Student" };
import { StudentStatusActions } from "./student-status-actions";

export default async function StudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, { tab: tabParam }] = await Promise.all([params, searchParams]);
  const tab = tabParam === "profile" ? "profile" : "courses";
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
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <Link
        href="/admin/students"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon aria-hidden className="size-4" />
        All students
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-border bg-card p-5 sm:p-7">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-bold tracking-[-0.02em] sm:text-3xl">{displayName(student)}</h1>
            <Badge variant={student.is_active ? "success" : "secondary"}>
              {student.is_active ? "Active" : "Deactivated"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{student.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StudentStatusActions studentId={student.id} isActive={student.is_active} />
        </div>
      </div>

      <SectionTabs
        basePath={`/admin/students/${student.id}`}
        active={tab}
        tabs={[
          { id: "courses", label: "Batch and courses" },
          { id: "profile", label: "Profile and guardian" },
        ]}
      />

      {tab === "profile" ? (
        <div className="rounded-3xl border border-border bg-card p-5 sm:p-7">
          <StudentProfileForm student={student} />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-5 sm:p-7">
            <h2 className="font-heading text-lg font-bold">Batch</h2>
            <p className="mt-1 text-sm text-muted-foreground">The group this student is taught with.</p>
            <div className="mt-4 max-w-md">
              {batchesError ? (
                <p className="text-sm text-destructive">Could not load batches. Please refresh the page.</p>
              ) : (
                <BatchReassignSelect studentId={student.id} batches={batches ?? []} currentBatchId={student.batch_id} />
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-5 sm:p-7">
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
        </div>
      )}
    </div>
  );
}