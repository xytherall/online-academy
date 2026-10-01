import type { Metadata } from "next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CourseProgressCard } from "@/components/student/course-progress-card";
import { EmptyState } from "@/components/empty-state";
import { requireStudent } from "@/lib/auth";
import { getStudentCourseReports } from "@/lib/progress-report";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My Courses" };

export default async function StudentCoursesPage() {
  const profile = await requireStudent();
  const supabase = await createClient();
  const { courses, error } = await getStudentCourseReports(supabase, profile.id, profile.batch_id);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">My Courses</h1>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>Could not load your courses. Please refresh the page.</AlertDescription>
        </Alert>
      ) : courses.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map(({ report }) => (
            <CourseProgressCard key={report.course.id} report={report} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No courses yet"
          description="You're not enrolled in any courses yet — contact the academy."
        />
      )}
    </div>
  );
}
