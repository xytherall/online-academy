import { notFound } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProgressReport } from "@/components/report/progress-report";
import { displayName } from "@/lib/display-name";
import { buildPublicAssetUrl } from "@/lib/settings";
import { getSiteSettings } from "@/lib/get-site-settings";
import { getStudentCourseReports } from "@/lib/progress-report";
import { getStudentProfile } from "@/lib/students";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "./print-button";

export default async function AdminStudentReportPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const student = await getStudentProfile(supabase, id);
  if (!student) notFound();

  const [{ courses, error }, settings, { data: batch }] = await Promise.all([
    getStudentCourseReports(supabase, student.id, student.batch_id),
    getSiteSettings(),
    student.batch_id
      ? supabase.from("batches").select("name").eq("id", student.batch_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Could not load this student&apos;s report. Please refresh the page.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end print:hidden">
        <PrintButton />
      </div>
      <ProgressReport
        data={{
          academyName: settings?.academy_name?.trim() || null,
          logoUrl: settings?.logo_path ? buildPublicAssetUrl(settings.logo_path) : null,
          studentName: displayName(student),
          batchName: batch?.name ?? null,
          country: student.country,
          generatedAtIso: new Date().toISOString(),
          courses,
        }}
      />
    </div>
  );
}
