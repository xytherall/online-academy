import Link from "next/link";
import { EmptyState } from "@/components/admin/empty-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { DeleteCourseButton } from "./course-row-actions";

export default async function AdminCoursesPage() {
  const supabase = await createClient();
  const { data: courses, error } = await supabase.from("courses").select("*").order("title");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Courses</h1>
        <Button render={<Link href="/admin/courses/new" />} nativeButton={false}>New course</Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>Could not load courses. Please refresh the page.</AlertDescription>
        </Alert>
      ) : courses && courses.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="hidden sm:table-cell">Level</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.map((course) => (
              <TableRow key={course.id}>
                <TableCell>
                  <Link href={`/admin/courses/${course.id}`} className="font-medium hover:underline">
                    {course.title}
                  </Link>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{course.level} Level</TableCell>
                <TableCell>
                  <Badge variant={course.is_published ? "default" : "secondary"}>
                    {course.is_published ? "Published" : "Unpublished"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" render={<Link href={`/admin/courses/${course.id}`} />} nativeButton={false}>
                      Edit
                    </Button>
                    <DeleteCourseButton courseId={course.id} courseTitle={course.title} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyState
          title="No courses yet"
          description="Create your first course to get started."
          action={
            <Button render={<Link href="/admin/courses/new" />} nativeButton={false} className="mt-2">
              New course
            </Button>
          }
        />
      )}
    </div>
  );
}
