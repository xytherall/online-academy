import { describe, expect, it } from "vitest";
import {
  computeCourseReport,
  computeHomeworkSummary,
  formatScoreValue,
  type AssessmentReportRow,
  type ReportAssessment,
  type ReportSubmission,
} from "./progress-report";

const COURSE = { id: "course-1", title: "O Level Maths", level: "O" as const };
const NOW = new Date("2026-09-30T00:00:00Z");

function assessment(overrides: Partial<ReportAssessment> & { id: string }): ReportAssessment {
  return {
    title: "Assessment",
    type: "assignment",
    due_at: "2026-09-01T00:00:00Z",
    total_marks: 100,
    ...overrides,
  };
}

function submission(overrides: Partial<ReportSubmission> & { assessment_id: string }): ReportSubmission {
  return {
    marks: null,
    counts_toward_report: false,
    is_late: false,
    submitted_at: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

describe("computeCourseReport", () => {
  it("shows 'No marked work yet' (null) when nothing is counted", () => {
    const assessments = [assessment({ id: "a1" })];
    const report = computeCourseReport(COURSE, assessments, [], NOW);

    expect(report.overallPct).toBeNull();
    expect(report.assignmentsPct).toBeNull();
    expect(report.testsPct).toBeNull();
    expect(report.markedCount).toBe(0);
    expect(report.totalCount).toBe(1);
  });

  it("counts only marks that are non-null and counts_toward_report true", () => {
    const assessments = [
      assessment({ id: "a1", due_at: "2026-09-01T00:00:00Z", total_marks: 100 }),
      assessment({ id: "a2", due_at: "2026-09-05T00:00:00Z", total_marks: 50 }),
      assessment({ id: "a3", due_at: "2026-09-10T00:00:00Z", total_marks: 50 }),
    ];
    const submissions = [
      // counted: on-time, marked
      submission({ assessment_id: "a1", marks: 80, counts_toward_report: true, is_late: false }),
      // late but counted (admin override) — still counts, no footnote
      submission({ assessment_id: "a2", marks: 40, counts_toward_report: true, is_late: true }),
      // late and NOT counted — footnote, excluded from percentages
      submission({ assessment_id: "a3", marks: 10, counts_toward_report: false, is_late: true }),
    ];

    const report = computeCourseReport(COURSE, assessments, submissions, NOW);

    // (80 + 40) / (100 + 50) = 80%
    expect(report.overallPct).toBe(80);
    expect(report.assignmentsPct).toBe(80);
    expect(report.testsPct).toBeNull();
    expect(report.markedCount).toBe(3);

    const lateUncounted = report.rows.find((row) => row.assessment.id === "a3");
    expect(lateUncounted?.lateAndUncounted).toBe(true);
    expect(lateUncounted?.counted).toBe(false);

    const lateCounted = report.rows.find((row) => row.assessment.id === "a2");
    expect(lateCounted?.lateAndUncounted).toBe(false);
    expect(lateCounted?.counted).toBe(true);
  });

  it("splits assignments and tests into separate percentages", () => {
    const assessments = [
      assessment({ id: "a1", type: "assignment", total_marks: 100 }),
      assessment({ id: "t1", type: "test", total_marks: 100 }),
    ];
    const submissions = [
      submission({ assessment_id: "a1", marks: 50, counts_toward_report: true }),
      submission({ assessment_id: "t1", marks: 90, counts_toward_report: true }),
    ];

    const report = computeCourseReport(COURSE, assessments, submissions, NOW);

    expect(report.assignmentsPct).toBe(50);
    expect(report.testsPct).toBe(90);
    expect(report.overallPct).toBe(70);
  });

  it("counts missing as assignments past due with no submission (not tests)", () => {
    const assessments = [
      assessment({ id: "a1", type: "assignment", due_at: "2026-01-01T00:00:00Z" }),
      assessment({ id: "a2", type: "assignment", due_at: "2099-01-01T00:00:00Z" }),
      assessment({ id: "t1", type: "test", due_at: "2026-01-01T00:00:00Z" }),
    ];

    const report = computeCourseReport(COURSE, assessments, [], NOW);

    expect(report.missingCount).toBe(1);
    expect(report.rows.find((r) => r.assessment.id === "a1")?.status).toBe("Missing");
    expect(report.rows.find((r) => r.assessment.id === "a2")?.status).toBe("Not submitted");
    expect(report.rows.find((r) => r.assessment.id === "t1")?.status).toBe("Not yet marked");
  });

  it("rounds percentages to one decimal place", () => {
    const assessments = [assessment({ id: "a1", total_marks: 3 })];
    const submissions = [submission({ assessment_id: "a1", marks: 1, counts_toward_report: true })];

    const report = computeCourseReport(COURSE, assessments, submissions, NOW);

    // 1/3 = 33.333...% -> 33.3
    expect(report.overallPct).toBe(33.3);
  });

  it("hides strongest/weakest when fewer than 2 counted assessments", () => {
    const assessments = [assessment({ id: "a1" })];
    const submissions = [submission({ assessment_id: "a1", marks: 90, counts_toward_report: true })];

    const report = computeCourseReport(COURSE, assessments, submissions, NOW);

    expect(report.strongest).toBeNull();
    expect(report.weakest).toBeNull();
  });

  it("picks the highest and lowest counted assessment", () => {
    const assessments = [
      assessment({ id: "a1", total_marks: 100 }),
      assessment({ id: "a2", total_marks: 100 }),
      assessment({ id: "a3", total_marks: 100 }),
    ];
    const submissions = [
      submission({ assessment_id: "a1", marks: 90, counts_toward_report: true }),
      submission({ assessment_id: "a2", marks: 40, counts_toward_report: true }),
      submission({ assessment_id: "a3", marks: 70, counts_toward_report: true }),
    ];

    const report = computeCourseReport(COURSE, assessments, submissions, NOW);

    expect(report.strongest?.assessment.id).toBe("a1");
    expect(report.strongest?.percentage).toBe(90);
    expect(report.weakest?.assessment.id).toBe("a2");
    expect(report.weakest?.percentage).toBe(40);
  });

  it("breaks a tie for strongest/weakest by picking the most recently due assessment", () => {
    const assessments = [
      assessment({ id: "a1", due_at: "2026-09-01T00:00:00Z", total_marks: 100 }),
      assessment({ id: "a2", due_at: "2026-09-15T00:00:00Z", total_marks: 100 }),
    ];
    const submissions = [
      submission({ assessment_id: "a1", marks: 50, counts_toward_report: true }),
      submission({ assessment_id: "a2", marks: 50, counts_toward_report: true }),
    ];

    const report = computeCourseReport(COURSE, assessments, submissions, NOW);

    expect(report.strongest?.assessment.id).toBe("a2");
    // weakest ties the strongest exactly (same tie-break winner) -> hidden
    expect(report.weakest).toBeNull();
  });

  it("marks a row upcoming only when not yet due and nothing submitted or marked", () => {
    const assessments = [
      assessment({ id: "a1", due_at: "2099-01-01T00:00:00Z" }), // future, no submission
      assessment({ id: "a2", due_at: "2099-01-01T00:00:00Z" }), // future, submitted early
      assessment({ id: "a3", due_at: "2026-01-01T00:00:00Z" }), // past, no submission (Missing, not upcoming)
    ];
    const submissions = [
      submission({ assessment_id: "a2", submitted_at: "2026-09-01T00:00:00Z", marks: null }),
    ];

    const report = computeCourseReport(COURSE, assessments, submissions, NOW);

    expect(report.rows.find((r) => r.assessment.id === "a1")?.upcoming).toBe(true);
    expect(report.rows.find((r) => r.assessment.id === "a2")?.upcoming).toBe(false);
    expect(report.rows.find((r) => r.assessment.id === "a2")?.status).toBe("Submitted");
    expect(report.rows.find((r) => r.assessment.id === "a3")?.upcoming).toBe(false);
  });

  it("computes a per-row percentage, null when unmarked", () => {
    const assessments = [assessment({ id: "a1", total_marks: 40 }), assessment({ id: "a2" })];
    const submissions = [submission({ assessment_id: "a1", marks: 34, counts_toward_report: true })];

    const report = computeCourseReport(COURSE, assessments, submissions, NOW);

    expect(report.rows.find((r) => r.assessment.id === "a1")?.pct).toBe(85);
    expect(report.rows.find((r) => r.assessment.id === "a2")?.pct).toBeNull();
  });

  describe("trend", () => {
    it("is null with fewer than 3 marked assessments", () => {
      const assessments = [assessment({ id: "a1" }), assessment({ id: "a2" })];
      const submissions = [
        submission({ assessment_id: "a1", marks: 80, counts_toward_report: true }),
        submission({ assessment_id: "a2", marks: 70, counts_toward_report: true }),
      ];

      const report = computeCourseReport(COURSE, assessments, submissions, NOW);

      expect(report.trend).toBeNull();
    });

    it("appears at exactly 3 marked assessments, ordered by due date, hollow for late-and-uncounted", () => {
      const assessments = [
        assessment({ id: "a1", due_at: "2026-09-10T00:00:00Z", total_marks: 100 }),
        assessment({ id: "a2", due_at: "2026-09-01T00:00:00Z", total_marks: 100 }),
        assessment({ id: "a3", due_at: "2026-09-20T00:00:00Z", total_marks: 100 }),
      ];
      const submissions = [
        submission({ assessment_id: "a1", marks: 80, counts_toward_report: true }),
        submission({ assessment_id: "a2", marks: 90, counts_toward_report: true }),
        submission({ assessment_id: "a3", marks: 60, counts_toward_report: false, is_late: true }),
      ];

      const report = computeCourseReport(COURSE, assessments, submissions, NOW);

      expect(report.trend).not.toBeNull();
      expect(report.trend?.points.map((p) => p.assessment.id)).toEqual(["a2", "a1", "a3"]);
      expect(report.trend?.points.find((p) => p.assessment.id === "a3")?.hollow).toBe(true);
      expect(report.trend?.points.find((p) => p.assessment.id === "a1")?.hollow).toBe(false);
      // average is the course's overall %, which excludes the hollow point: (80+90)/200 = 85
      expect(report.trend?.averagePct).toBe(85);
    });

    it("has a null average when every marked row is late-and-uncounted", () => {
      const assessments = [
        assessment({ id: "a1" }),
        assessment({ id: "a2" }),
        assessment({ id: "a3" }),
      ];
      const submissions = assessments.map((a) =>
        submission({ assessment_id: a.id, marks: 50, counts_toward_report: false, is_late: true }),
      );

      const report = computeCourseReport(COURSE, assessments, submissions, NOW);

      expect(report.trend?.points).toHaveLength(3);
      expect(report.trend?.averagePct).toBeNull();
    });
  });
});

describe("computeHomeworkSummary", () => {
  function row(overrides: {
    assessment: Partial<ReportAssessment>;
    submission?: ReportSubmission | null;
  }): Pick<AssessmentReportRow, "assessment" | "submission"> {
    return {
      assessment: assessment({ id: "x", type: "assignment", ...overrides.assessment }),
      submission: overrides.submission === undefined ? null : overrides.submission,
    };
  }

  it("is null when no assignments are past due yet", () => {
    const rows = [row({ assessment: { due_at: "2099-01-01T00:00:00Z" } })];
    expect(computeHomeworkSummary(rows, NOW)).toBeNull();
  });

  it("ignores tests entirely", () => {
    const rows = [
      row({ assessment: { type: "test", due_at: "2026-01-01T00:00:00Z" }, submission: null }),
    ];
    expect(computeHomeworkSummary(rows, NOW)).toBeNull();
  });

  it("counts a past-due assignment with no submission row as missing", () => {
    const rows = [row({ assessment: { due_at: "2026-01-01T00:00:00Z" }, submission: null })];
    expect(computeHomeworkSummary(rows, NOW)).toEqual({ onTime: 0, late: 0, missing: 1, total: 1 });
  });

  it("counts marks entered without an upload (WhatsApp) as handed in, on time unless late", () => {
    const rows = [
      row({
        assessment: { id: "a1", due_at: "2026-01-01T00:00:00Z" },
        submission: submission({ assessment_id: "a1", submitted_at: null, marks: 10, is_late: false }),
      }),
      row({
        assessment: { id: "a2", due_at: "2026-01-01T00:00:00Z" },
        submission: submission({ assessment_id: "a2", submitted_at: null, marks: 10, is_late: true }),
      }),
    ];

    expect(computeHomeworkSummary(rows, NOW)).toEqual({ onTime: 1, late: 1, missing: 0, total: 2 });
  });

  it("counts a real upload by on-time/late, regardless of marking state", () => {
    const rows = [
      row({
        assessment: { id: "a1", due_at: "2026-01-01T00:00:00Z" },
        submission: submission({
          assessment_id: "a1",
          submitted_at: "2026-01-01T00:00:00Z",
          marks: null,
          is_late: false,
        }),
      }),
    ];

    expect(computeHomeworkSummary(rows, NOW)).toEqual({ onTime: 1, late: 0, missing: 0, total: 1 });
  });
});

describe("formatScoreValue", () => {
  it("shows the percentage when marked", () => {
    expect(formatScoreValue(72.5, 72.5)).toEqual({ value: "72.5%", caption: null });
  });

  it("shows 'Not marked yet' when nothing is counted at all", () => {
    expect(formatScoreValue(null, null)).toEqual({ value: "Not marked yet", caption: null });
  });

  it("shows a dash + 'none marked yet' when only this category has nothing counted", () => {
    expect(formatScoreValue(null, 80)).toEqual({ value: "—", caption: "none marked yet" });
  });
});
