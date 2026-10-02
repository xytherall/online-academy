import type { Metadata } from "next";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { StudentsTable, type StudentRow } from "./students-table";

export const metadata: Metadata = { title: "Students" };

export default async function AdminStudentsPage() {
  const supabase = await createClient();

  const [
    { data: profiles, error: profilesError },
    { data: enrollments },
    { data: batches },
    { data: courses },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, phone, country, is_active, batch_id, batches(id, name)")
      .eq("role", "student")
      .order("full_name"),
    supabase.from("enrollments").select("student_id, course_id"),
    supabase.from("batches").select("id, name").order("name"),
    supabase.from("courses").select("id, title").order("title"),
  ]);

  const courseIdsByStudent = new Map<string, string[]>();
  for (const row of enrollments ?? []) {
    const list = courseIdsByStudent.get(row.student_id) ?? [];
    list.push(row.course_id);
    courseIdsByStudent.set(row.student_id, list);
  }

  const students: StudentRow[] = (profiles ?? []).map((profile) => ({
    id: profile.id,
    full_name: profile.full_name,
    email: profile.email,
    phone: profile.phone,
    country: profile.country,
    is_active: profile.is_active,
    batch: profile.batches ? { id: profile.batches.id, name: profile.batches.name } : null,
    course_ids: courseIdsByStudent.get(profile.id) ?? [],
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Students</h1>
        <Button render={<Link href="/admin/students/new" />} nativeButton={false}>Add student</Button>
      </div>

      {profilesError ? (
        <Alert variant="destructive">
          <AlertDescription>Could not load students. Please refresh the page.</AlertDescription>
        </Alert>
      ) : (
        <StudentsTable students={students} batches={batches ?? []} courses={courses ?? []} />
      )}
    </div>
  );
}
