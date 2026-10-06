import type { Database } from "@/lib/supabase/database.types";

export type AssessmentType = Database["public"]["Enums"]["assessment_type"];

const LABELS: Record<AssessmentType, string> = {
  assignment: "Assignment",
  test: "Test",
  quiz: "Quiz",
};

/** Display name of an assessment type, used everywhere a type pill or label is shown. */
export function assessmentTypeLabel(type: AssessmentType): string {
  return LABELS[type];
}
