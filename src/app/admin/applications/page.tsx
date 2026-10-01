import type { Metadata } from "next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/server";
import { ApplicationsTable, type ApplicationRow } from "./applications-table";

export const metadata: Metadata = { title: "Applications" };

export default async function AdminApplicationsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("applications")
    .select("id, full_name, email, country, level, status, course_ids, created_at")
    .order("created_at", { ascending: false });

  const applications: ApplicationRow[] = (data ?? []).map((row) => ({
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    country: row.country,
    level: row.level,
    status: row.status,
    course_count: row.course_ids.length,
    created_at: row.created_at,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Applications</h1>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>Could not load applications. Please refresh the page.</AlertDescription>
        </Alert>
      ) : (
        <ApplicationsTable applications={applications} />
      )}
    </div>
  );
}
