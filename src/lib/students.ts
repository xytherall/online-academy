import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

type Profile = Tables<"profiles">;

/**
 * Loads a profile and confirms it is a student before returning it. Every
 * Server Action that mutates a profile by id (reassigning a batch,
 * deactivating, resetting a password, editing enrollments, …) must go
 * through this first, so a crafted id can never be used to act on an admin
 * account instead of a student (SPEC §3: role/batch/active status are never
 * client-trusted; this is the server-side backstop for "which account").
 */
export async function getStudentProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string,
): Promise<Profile | null> {
  const { data } = await supabase.from("profiles").select("*").eq("id", studentId).maybeSingle();
  if (!data || data.role !== "student") return null;
  return data;
}
