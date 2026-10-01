import type { AssessmentStatus } from "@/lib/assessments";

/**
 * The only Badge variants used for status pills across student + admin
 * (SPEC §12, §15). "info" reuses the existing primary/primary-soft tokens —
 * SPEC §12 defines no separate info colour.
 */
export type StatusBadgeVariant = "success" | "warning" | "late" | "info" | "secondary";

/**
 * Single status → pill mapping (SPEC §15 decision), used everywhere an
 * AssessmentStatus is shown so every page renders it identically.
 */
export function assessmentStatusBadgeVariant(status: AssessmentStatus): StatusBadgeVariant {
  switch (status) {
    case "Marked":
      return "success";
    case "Missing":
    case "Submitted late":
      return "late";
    case "Submitted":
      return "info";
    case "Not submitted":
    case "Not yet marked":
      return "secondary";
  }
}

/**
 * Progress report assessment table pill: the row's normal status, with two
 * report-only overrides layered on top (SPEC §9) — not a change to
 * `computeAssessmentStatus` itself, which still drives every other page.
 */
export function reportRowBadge(row: {
  status: AssessmentStatus;
  upcoming: boolean;
  lateAndUncounted: boolean;
}): { label: string; variant: StatusBadgeVariant } {
  if (row.upcoming) return { label: "Upcoming", variant: "info" };
  if (row.lateAndUncounted) return { label: "Late", variant: "warning" };
  return { label: row.status, variant: assessmentStatusBadgeVariant(row.status) };
}

/**
 * Due/overdue pill for upcoming assignments (dashboard "Due soon" list).
 * Purely a display label derived from the existing `due_at` — not a stored
 * status and does not change `computeAssessmentStatus`.
 */
export function dueDateBadge(dueAtIso: string, now: Date = new Date()): { label: string; variant: StatusBadgeVariant } {
  return new Date(dueAtIso) < now ? { label: "Overdue", variant: "late" } : { label: "Due soon", variant: "warning" };
}

/** Active/Deactivated pill (students list + detail). */
export function activeStatusBadgeVariant(isActive: boolean): StatusBadgeVariant {
  return isActive ? "success" : "secondary";
}

/** Published/Unpublished pill (courses list). */
export function publishedStatusBadgeVariant(isPublished: boolean): StatusBadgeVariant {
  return isPublished ? "success" : "secondary";
}

/** Pending/Accepted/Rejected pill (applications). */
export function applicationStatusBadgeVariant(status: "pending" | "accepted" | "rejected"): StatusBadgeVariant {
  switch (status) {
    case "accepted":
      return "success";
    case "rejected":
      return "late";
    case "pending":
      return "warning";
  }
}
