import { upcomingCutoffIso } from "@/lib/live-classes-core";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type StudentLiveClass = Pick<Tables<"live_classes">, "id" | "title" | "starts_at" | "join_url" | "note">;

/**
 * Upcoming classes for the signed-in student, soonest first. RLS ("Students
 * can read their live classes") limits rows to all-student classes and the
 * student's own batch; this only drops classes that started over an hour ago.
 */
export async function getUpcomingLiveClasses(): Promise<{ liveClasses: StudentLiveClass[] | null; error: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("live_classes")
    .select("id, title, starts_at, join_url, note")
    .gte("starts_at", upcomingCutoffIso())
    .order("starts_at");

  if (error) return { liveClasses: null, error: true };
  return { liveClasses: data, error: false };
}
