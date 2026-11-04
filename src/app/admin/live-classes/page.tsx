import type { Metadata } from "next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { upcomingCutoffIso } from "@/lib/live-classes-core";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import { LiveClassManager, type AdminLiveClass } from "./live-class-manager";

export const metadata: Metadata = { title: "Live classes" };

const PAST_LIMIT = 20;
const LIVE_CLASS_COLUMNS = "*, live_class_courses(course_id), live_class_batches(batch_id)";

type LiveClassWithTargets = Tables<"live_classes"> & {
  live_class_courses: { course_id: string }[];
  live_class_batches: { batch_id: string }[];
};

function withTargetIds({ live_class_courses, live_class_batches, ...liveClass }: LiveClassWithTargets): AdminLiveClass {
  return {
    ...liveClass,
    course_ids: live_class_courses.map((row) => row.course_id),
    batch_ids: live_class_batches.map((row) => row.batch_id),
  };
}

export default async function AdminLiveClassesPage() {
  const supabase = await createClient();
  const cutoff = upcomingCutoffIso();
  const [{ data: upcoming, error: upcomingError }, { data: past, error: pastError }, { data: batches }, { data: courses }] =
    await Promise.all([
      supabase.from("live_classes").select(LIVE_CLASS_COLUMNS).gte("starts_at", cutoff).order("starts_at"),
      supabase
        .from("live_classes")
        .select(LIVE_CLASS_COLUMNS)
        .lt("starts_at", cutoff)
        .order("starts_at", { ascending: false })
        .limit(PAST_LIMIT),
      supabase.from("batches").select("id, name").order("name"),
      supabase.from("courses").select("id, title").order("title"),
    ]);

  if (upcomingError || pastError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Could not load live classes. Please refresh the page.</AlertDescription>
      </Alert>
    );
  }

  return (
    <LiveClassManager
      upcoming={(upcoming ?? []).map(withTargetIds)}
      past={(past ?? []).map(withTargetIds)}
      batches={batches ?? []}
      courses={courses ?? []}
    />
  );
}
