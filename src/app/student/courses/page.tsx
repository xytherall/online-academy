import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/admin/empty-state";
import { requireStudent } from "@/lib/auth";
import { getEnrolledCourses } from "@/lib/student";

export default async function StudentCoursesPage() {
  const profile = await requireStudent();
  const { courses, error } = await getEnrolledCourses(profile.id);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">My Courses</h1>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>Could not load your courses. Please refresh the page.</AlertDescription>
        </Alert>
      ) : courses && courses.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link key={course.id} href={`/student/courses/${course.id}`}>
              <Card className="h-full transition-colors hover:bg-accent/50">
                <CardHeader>
                  <CardTitle>{course.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="secondary">{course.level} Level</Badge>
                </CardContent>
              </Card>
            </Link>
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
