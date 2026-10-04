import type { Metadata } from "next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { upcomingCutoffIso } from "@/lib/live-classes-core";
import { createClient } from "@/lib/supabase/server";
import { LiveClassManager } from "./live-class-manager";

export const metadata: Metadata = { title: "Live classes" };

const PAST_LIMIT = 20;

export default async function AdminLiveClassesPage() {
  const supabase = await createClient();
  const cutoff = upcomingCutoffIso();
  const [{ data: upcoming, error: upcomingError }, { data: past, error: pastError }, { data: batches }] =
    await Promise.all([
      supabase.from("live_classes").select("*").gte("starts_at", cutoff).order("starts_at"),
      supabase
        .from("live_classes")
        .select("*")
        .lt("starts_at", cutoff)
        .order("starts_at", { ascending: false })
        .limit(PAST_LIMIT),
      supabase.from("batches").select("id, name").order("name"),
    ]);

  if (upcomingError || pastError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Could not load live classes. Please refresh the page.</AlertDescription>
      </Alert>
    );
  }

  return <LiveClassManager upcoming={upcoming ?? []} past={past ?? []} batches={batches ?? []} />;
}
