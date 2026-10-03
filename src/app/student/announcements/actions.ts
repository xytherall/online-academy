"use server";

import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function markAnnouncementsSeen(): Promise<void> {
  const profile = await requireStudent();
  const supabase = await createClient();

  await supabase
    .from("announcement_seen")
    .upsert({ user_id: profile.id, last_seen_at: new Date().toISOString() }, { onConflict: "user_id" });
}
