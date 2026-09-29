import { createClient } from "@/lib/supabase/server";
import { StudentForm } from "../student-form";

export default async function NewStudentPage() {
  const supabase = await createClient();

  const [{ data: courses }, { data: batches }] = await Promise.all([
    supabase.from("courses").select("id, title, level").order("level").order("title"),
    supabase.from("batches").select("id, name").order("name"),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Add student</h1>
      <StudentForm courses={courses ?? []} batches={batches ?? []} />
    </div>
  );
}
