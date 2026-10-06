import type { Metadata } from "next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/server";
import { ClearFilesCard } from "./clear-files-card";
import { LogoUploader } from "./logo-uploader";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const [{ data: settings, error }, { data: filesSummary, error: filesSummaryError }] = await Promise.all([
    supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.rpc("marked_submission_files_summary").single(),
  ]);

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Academy name, branding and contact details shown across the public site and portal.
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>Could not load settings. Please refresh the page.</AlertDescription>
        </Alert>
      ) : (
        <>
          <LogoUploader logoPath={settings?.logo_path ?? null} />
          <SettingsForm settings={settings} />
        </>
      )}

      <ClearFilesCard
        summary={
          filesSummaryError || !filesSummary
            ? null
            : { fileCount: filesSummary.file_count, totalBytes: filesSummary.total_bytes }
        }
      />
    </div>
  );
}
