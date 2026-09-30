import { describe, expect, it } from "vitest";
import { computeCourseReport, type ReportAssessment, type ReportSubmission } from "./progress-report";

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
});
