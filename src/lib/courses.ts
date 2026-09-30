import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type PublicCourse = Tables<"courses">;

/** Cached per request, like getSiteSettings — read once, used by the page and generateMetadata. */
export const getPublishedCourses = cache(async (): Promise<PublicCourse[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("*")
    .eq("is_published", true)
    .order("level")
    .order("title");
  return data ?? [];
});

export const getPublishedCourseBySlug = cache(async (slug: string): Promise<PublicCourse | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  return data;
});
