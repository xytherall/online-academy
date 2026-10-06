import "server-only";
import { computeAssessmentStatus, type AssessmentStatus } from "@/lib/assessments";
import type { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

type Assessment = Tables<"assessments">;
type Submission = Tables<"submissions">;
type Course = Tables<"courses">;
type Enrollment = Tables<"enrollments">;

export type TeacherAssessment = Pick<
  Enrollment,
  "effort_rating" | "participation_rating" | "strengths" | "areas_to_improve" | "remarks"
>;

export type ReportAssessment = Pick<Assessment, "id" | "title" | "type" | "due_at" | "total_marks">;
export type ReportSubmission = Pick<
  Submission,
  "assessment_id" | "marks" | "counts_toward_report" | "is_late" | "submitted_at"
>;

export type AssessmentReportRow = {
  assessment: ReportAssessment;
  submission: ReportSubmission | null;
  status: AssessmentStatus;
  /** Marks not null AND counts_toward_report true — SPEC §9. */
  counted: boolean;
  /** Submitted late and excluded from the percentages — shown with a footnote. */
  lateAndUncounted: boolean;
  /** marks/total, rounded to 1 decimal; null when unmarked. */
  pct: number | null;
  /** Not yet due AND nothing submitted AND unmarked — drives the "Upcoming" pill only. */
  upcoming: boolean;
};

export type ExtremeResult = {
  assessment: ReportAssessment;
  marks: number;
  percentage: number;
};

export type TrendPoint = {
  assessment: ReportAssessment;
  marks: number;
  pct: number;
  /** Late and not counted — drawn hollow, excluded from the average line. */
  hollow: boolean;
};

export type CourseTrend = {
  points: TrendPoint[];
  /** The course's overallPct; null only if every marked row is late-and-uncounted. */
  averagePct: number | null;
};

export type CourseReport = {
  course: Pick<Course, "id" | "title" | "level">;
  /** null means "No marked work yet" rather than 0%. */
  overallPct: number | null;
  assignmentsPct: number | null;
  /** Tests and quizzes together (a quiz is a short test). */
  testsPct: number | null;
  markedCount: number;
  totalCount: number;
  /** Assignments past due with no submission — SPEC §9. */
  missingCount: number;
  /** Only set when there are at least 2 counted assessments; hidden below if it ties the strongest. */
  strongest: ExtremeResult | null;
  weakest: ExtremeResult | null;
  rows: AssessmentReportRow[];
  /** Only set once 3+ assessments are marked (counted or late-and-uncounted). */
  trend: CourseTrend | null;
};

export type HomeworkSummary = {
  onTime: number;
  late: number;
  missing: number;
  total: number;
};

/**
 * The homework donut's "handed in" rule: a submission row existing at all —
 * whether from a student upload or marks entered directly by the admin
 * (e.g. work sent via WhatsApp, SPEC §8) — counts as handed in. On time
 * unless `is_late` is true. Only a past-due assignment with no submission
 * row counts as Missing. A submission row can't exist without this being
 * consistent with `computeAssessmentStatus`'s own "Missing" rule (marks
 * can't be set without a submission row), so this agrees with every other
 * page's Missing count (SPEC §15) rather than being a separate rule.
 */
export function computeHomeworkSummary(
  rows: Pick<AssessmentReportRow, "assessment" | "submission">[],
  now: Date = new Date(),
): HomeworkSummary | null {
  const dueRows = rows.filter(
    (row) => row.assessment.type === "assignment" && new Date(row.assessment.due_at) <= now,
  );

  if (dueRows.length === 0) return null;

  let onTime = 0;
  let late = 0;
  let missing = 0;

  for (const row of dueRows) {
    if (!row.submission) missing++;
    else if (row.submission.is_late) late++;
    else onTime++;
  }

  return { onTime, late, missing, total: dueRows.length };
}

/**
 * Distinguishes the report's two "nothing counted" wordings for a score box:
 * "Not marked yet" when the course has no counted work at all, vs "—" with
 * a "none marked yet" caption when this particular category (assignments or
 * tests) has none but the course does have other counted work.
 */
export function formatScoreValue(
  pct: number | null,
  overallPct: number | null,
): { value: string; caption: string | null } {
  if (pct !== null) return { value: `${pct}%`, caption: null };
  if (overallPct === null) return { value: "Not marked yet", caption: null };
  return { value: "—", caption: "none marked yet" };
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function percentageOf(obtained: number, total: number): number | null {
  if (total <= 0) return null;
  return roundToOneDecimal((obtained / total) * 100);
}

function rowPercentage(row: AssessmentReportRow): number {
  return (row.submission!.marks! / row.assessment.total_marks) * 100;
}

/**
 * Picks the counted row with the highest ("max") or lowest ("min")
 * percentage. Ties go to the most recently due assessment (SPEC §9) —
 * `due_at` rather than `submitted_at`, since tests have no submission date
 * but still need a deterministic tie-break.
 */
function pickExtreme(rows: AssessmentReportRow[], direction: "max" | "min"): AssessmentReportRow {
  let best = rows[0];
  let bestPct = rowPercentage(best);

  for (const row of rows.slice(1)) {
    const pct = rowPercentage(row);
    const better = direction === "max" ? pct > bestPct : pct < bestPct;
    const tie = pct === bestPct;
    const moreRecent = new Date(row.assessment.due_at) > new Date(best.assessment.due_at);
    if (better || (tie && moreRecent)) {
      best = row;
      bestPct = pct;
    }
  }

  return best;
}

function toExtremeResult(row: AssessmentReportRow): ExtremeResult {
  return {
    assessment: row.assessment,
    marks: row.submission!.marks!,
    percentage: roundToOneDecimal(rowPercentage(row)),
  };
}

/**
 * The single calculation used by both /student/report and
 * /admin/students/[id]/report, so the numbers shown to a student and to an
 * admin can never diverge (SPEC §9). Pure and synchronous — all data must
 * already be fetched by the caller.
 */
export function computeCourseReport(
  course: Pick<Course, "id" | "title" | "level">,
  assessments: ReportAssessment[],
  submissions: ReportSubmission[],
  now: Date = new Date(),
): CourseReport {
  const rows: AssessmentReportRow[] = [...assessments]
    .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime())
    .map((assessment) => {
      const submission = submissions.find((s) => s.assessment_id === assessment.id) ?? null;
      const status = computeAssessmentStatus(assessment, submission, now);
      const counted = submission?.marks != null && submission.counts_toward_report === true;
      const lateAndUncounted =
        submission != null &&
        submission.marks != null &&
        submission.is_late === true &&
        submission.counts_toward_report === false;
      const pct =
        submission?.marks != null
          ? roundToOneDecimal((submission.marks / assessment.total_marks) * 100)
          : null;
      const upcoming = submission == null && new Date(assessment.due_at) > now;
      return { assessment, submission, status, counted, lateAndUncounted, pct, upcoming };
    });

  const markedCount = rows.filter((row) => row.submission?.marks != null).length;
  const missingCount = rows.filter((row) => row.status === "Missing").length;

  const counted = rows.filter((row) => row.counted);
  const countedAssignments = counted.filter((row) => row.assessment.type === "assignment");
  const countedTests = counted.filter((row) => row.assessment.type === "test" || row.assessment.type === "quiz");

  const sumMarks = (list: AssessmentReportRow[]) =>
    list.reduce((sum, row) => sum + row.submission!.marks!, 0);
  const sumTotal = (list: AssessmentReportRow[]) =>
    list.reduce((sum, row) => sum + row.assessment.total_marks, 0);

  const overallPct = percentageOf(sumMarks(counted), sumTotal(counted));
  const assignmentsPct = percentageOf(sumMarks(countedAssignments), sumTotal(countedAssignments));
  const testsPct = percentageOf(sumMarks(countedTests), sumTotal(countedTests));

  let strongest: ExtremeResult | null = null;
  let weakest: ExtremeResult | null = null;
  if (counted.length >= 2) {
    const strongestRow = pickExtreme(counted, "max");
    const weakestRow = pickExtreme(counted, "min");
    strongest = toExtremeResult(strongestRow);
    weakest =
      weakestRow.assessment.id === strongestRow.assessment.id ? null : toExtremeResult(weakestRow);
  }

  const markedRows = rows.filter((row) => row.submission?.marks != null);
  let trend: CourseTrend | null = null;
  if (markedRows.length >= 3) {
    trend = {
      points: markedRows.map((row) => ({
        assessment: row.assessment,
        marks: row.submission!.marks!,
        pct: row.pct!,
        hollow: row.lateAndUncounted,
      })),
      averagePct: overallPct,
    };
  }

  return {
    course,
    overallPct,
    assignmentsPct,
    testsPct,
    markedCount,
    totalCount: rows.length,
    missingCount,
    strongest,
    weakest,
    rows,
    trend,
  };
}

export type StudentCourseReport = { report: CourseReport; teacherAssessment: TeacherAssessment };

/**
 * Fetches everything /student/report and /admin/students/[id]/report need to
 * render the same numbers (SPEC §9: "so numbers can never differ"). Called
 * with the *viewer's* Supabase client — for the student's own page RLS
 * already scopes assessments to what they can see; for the admin page RLS
 * would return every assessment regardless of batch, so `studentBatchId` is
 * used to re-apply the same visibility rule an admin's client would
 * otherwise bypass (mirrors `getVisibleAssessmentForStudent` in
 * src/lib/assessments.ts, but for a bulk fetch across every enrolled course).
 */
export async function getStudentCourseReports(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string,
  studentBatchId: string | null,
): Promise<{ courses: StudentCourseReport[]; error: boolean }> {
  const { data: enrollments, error: enrollmentsError } = await supabase
    .from("enrollments")
    .select(
      "course_id, remarks, effort_rating, participation_rating, strengths, areas_to_improve, course:courses(id, title, level)",
    )
    .eq("student_id", studentId)
    .order("created_at");

  if (enrollmentsError || !enrollments) return { courses: [], error: true };

  const courseIds = enrollments.map((e) => e.course_id);
  if (courseIds.length === 0) return { courses: [], error: false };

  const [{ data: assessments, error: assessmentsError }, { data: submissions, error: submissionsError }] =
    await Promise.all([
      supabase
        .from("assessments")
        .select("id, title, type, due_at, total_marks, course_id, batch_id")
        .in("course_id", courseIds),
      supabase
        .from("submissions")
        .select("assessment_id, marks, counts_toward_report, is_late, submitted_at")
        .eq("student_id", studentId),
    ]);

  if (assessmentsError || submissionsError || !assessments || !submissions) {
    return { courses: [], error: true };
  }

  const courses: StudentCourseReport[] = enrollments
    .filter((e) => e.course)
    .map((enrollment) => {
      const course = enrollment.course!;
      const courseAssessments = assessments.filter(
        (a) =>
          a.course_id === course.id &&
          (a.batch_id == null ||
            a.batch_id === studentBatchId ||
            submissions.some((s) => s.assessment_id === a.id)),
      );
      const report = computeCourseReport(course, courseAssessments, submissions);
      return {
        report,
        teacherAssessment: {
          effort_rating: enrollment.effort_rating,
          participation_rating: enrollment.participation_rating,
          strengths: enrollment.strengths,
          areas_to_improve: enrollment.areas_to_improve,
          remarks: enrollment.remarks,
        },
      };
    });

  return { courses, error: false };
}
