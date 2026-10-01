import type { Metadata } from "next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProgressReport } from "@/components/report/progress-report";
import { displayName } from "@/lib/display-name";
import { buildPublicAssetUrl } from "@/lib/settings";
import { getSiteSettings } from "@/lib/get-site-settings";
import { computeHomeworkSummary, getStudentCourseReports } from "@/lib/progress-report";
import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Progress report" };

export default async function StudentReportPage() {
  const profile = await requireStudent();
  const supabase = await createClient();

  const [{ courses, error }, settings, { data: batch }] = await Promise.all([
    getStudentCourseReports(supabase, profile.id, profile.batch_id),
    getSiteSettings(),
    profile.batch_id
      ? supabase.from("batches").select("name").eq("id", profile.batch_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Could not load your progress report. Please refresh the page.</AlertDescription>
      </Alert>
    );
  }

  const homework = computeHomeworkSummary(courses.flatMap(({ report }) => report.rows));

  return (
    <ProgressReport
      data={{
        academyName: settings?.academy_name?.trim() || null,
        logoUrl: settings?.logo_path ? buildPublicAssetUrl(settings.logo_path) : null,
        studentName: displayName(profile),
        batchName: batch?.name ?? null,
        country: profile.country,
        generatedAtIso: new Date().toISOString(),
        courses,
        homework,
      }}
    />
  );
}
