import { LocalDateTime } from "@/components/local-date-time";
import type { AssessmentStatus } from "@/lib/assessments";
import type { CourseReport, TeacherAssessment } from "@/lib/progress-report";

export type ProgressReportData = {
  academyName: string | null;
  logoUrl: string | null;
  studentName: string;
  batchName: string | null;
  country: string | null;
  generatedAtIso: string;
  courses: { report: CourseReport; teacherAssessment: TeacherAssessment }[];
};

const RATING_LABELS: Record<NonNullable<TeacherAssessment["effort_rating"]>, string> = {
  excellent: "Excellent",
  good: "Good",
  satisfactory: "Satisfactory",
  needs_improvement: "Needs improvement",
};

function formatPct(pct: number | null): string {
  return pct === null ? "No marked work yet" : `${pct}%`;
}

function hasAnyTeacherAssessment(assessment: TeacherAssessment): boolean {
  return Boolean(
    assessment.effort_rating ||
      assessment.participation_rating ||
      assessment.strengths ||
      assessment.areas_to_improve ||
      assessment.remarks,
  );
}

const STATUS_LABEL: Record<AssessmentStatus, string> = {
  "Not submitted": "Not submitted",
  Submitted: "Submitted",
  "Submitted late": "Submitted late",
  Marked: "Marked",
  Missing: "Missing",
  "Not yet marked": "Not yet marked",
};

export function ProgressReport({ data }: { data: ProgressReportData }) {
  return (
    <div className="space-y-8 print:space-y-6">
      <header className="space-y-3 border-b border-border pb-4 print:border-black">
        {data.academyName || data.logoUrl ? (
          <div className="flex items-center gap-3">
            {data.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- public bucket asset
              <img src={data.logoUrl} alt="" className="h-10 w-10 rounded object-contain" />
            ) : null}
            {data.academyName ? <span className="text-lg font-semibold">{data.academyName}</span> : null}
          </div>
        ) : null}
        <h1 className="text-xl font-semibold">Student Progress Report</h1>
        <dl className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
          <div>
            <span className="font-medium text-foreground">Student:</span> {data.studentName}
          </div>
          {data.batchName ? (
            <div>
              <span className="font-medium text-foreground">Batch:</span> {data.batchName}
            </div>
          ) : null}
          {data.country ? (
            <div>
              <span className="font-medium text-foreground">Country:</span> {data.country}
            </div>
          ) : null}
          <div>
            <span className="font-medium text-foreground">Generated:</span>{" "}
            <LocalDateTime iso={data.generatedAtIso} />
          </div>
        </dl>
      </header>

      {data.courses.length === 0 ? (
        <p className="text-sm text-muted-foreground">Not enrolled in any courses yet.</p>
      ) : (
        <>
          <section aria-label="Summary" className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left print:border-black">
                  <th className="py-2 pr-3 font-medium">Course</th>
                  <th className="py-2 pr-3 font-medium">Overall</th>
                  <th className="py-2 pr-3 font-medium">Assignments</th>
                  <th className="py-2 pr-3 font-medium">Tests</th>
                  <th className="py-2 pr-3 font-medium">Missing</th>
                </tr>
              </thead>
              <tbody>
                {data.courses.map(({ report }) => (
                  <tr key={report.course.id} className="border-b border-border/60 print:border-black/40">
                    <td className="py-2 pr-3">{report.course.title}</td>
                    <td className="py-2 pr-3">{formatPct(report.overallPct)}</td>
                    <td className="py-2 pr-3">{formatPct(report.assignmentsPct)}</td>
                    <td className="py-2 pr-3">{formatPct(report.testsPct)}</td>
                    <td className="py-2 pr-3">{report.missingCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {data.courses.map(({ report, teacherAssessment }, index) => (
            <CourseSection
              key={report.course.id}
              report={report}
              teacherAssessment={teacherAssessment}
              breakBefore={index > 0}
            />
          ))}
        </>
      )}
    </div>
  );
}

function CourseSection({
  report,
  teacherAssessment,
  breakBefore,
}: {
  report: CourseReport;
  teacherAssessment: TeacherAssessment;
  breakBefore: boolean;
}) {
  const hasFootnote = report.rows.some((row) => row.lateAndUncounted);

  return (
    <section className={`space-y-4 ${breakBefore ? "print:break-before-page" : ""}`}>
      <div>
        <h2 className="text-lg font-semibold">{report.course.title}</h2>
        <p className="text-sm text-muted-foreground">{report.course.level} Level</p>
      </div>

      <dl className="grid gap-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">Overall</dt>
          <dd className="font-medium">{formatPct(report.overallPct)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Assignments</dt>
          <dd className="font-medium">{formatPct(report.assignmentsPct)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Tests</dt>
          <dd className="font-medium">{formatPct(report.testsPct)}</dd>
        </div>
      </dl>

      <p className="text-sm text-muted-foreground">
        {report.markedCount} of {report.totalCount} marked
        {report.missingCount > 0 ? ` · ${report.missingCount} missing` : ""}
      </p>

      {report.strongest ? (
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <span className="font-medium">Strongest result:</span> {report.strongest.assessment.title} (
            {report.strongest.percentage}%)
          </div>
          {report.weakest ? (
            <div>
              <span className="font-medium">Weakest result:</span> {report.weakest.assessment.title} (
              {report.weakest.percentage}%)
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left print:border-black">
              <th className="py-2 pr-3 font-medium">Title</th>
              <th className="py-2 pr-3 font-medium">Type</th>
              <th className="py-2 pr-3 font-medium">Due</th>
              <th className="py-2 pr-3 font-medium">Marks</th>
              <th className="py-2 pr-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row) => (
              <tr key={row.assessment.id} className="border-b border-border/60 print:border-black/40">
                <td className="py-2 pr-3">
                  {row.assessment.title}
                  {row.lateAndUncounted ? <sup className="ml-0.5">*</sup> : null}
                </td>
                <td className="py-2 pr-3 capitalize">{row.assessment.type}</td>
                <td className="py-2 pr-3">
                  <LocalDateTime iso={row.assessment.due_at} />
                </td>
                <td className="py-2 pr-3">
                  {row.submission?.marks != null ? `${row.submission.marks} / ${row.assessment.total_marks}` : "—"}
                </td>
                <td className="py-2 pr-3">{STATUS_LABEL[row.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {hasFootnote ? (
          <p className="mt-1 text-xs text-muted-foreground">
            * Submitted late; not counted toward the percentages above.
          </p>
        ) : null}
      </div>

      {hasAnyTeacherAssessment(teacherAssessment) ? (
        <div className="space-y-2 rounded-lg border border-border p-4 print:border-black">
          <h3 className="font-medium">Teacher assessment</h3>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            {teacherAssessment.effort_rating ? (
              <div>
                <dt className="text-muted-foreground">Effort</dt>
                <dd>{RATING_LABELS[teacherAssessment.effort_rating]}</dd>
              </div>
            ) : null}
            {teacherAssessment.participation_rating ? (
              <div>
                <dt className="text-muted-foreground">Class participation</dt>
                <dd>{RATING_LABELS[teacherAssessment.participation_rating]}</dd>
              </div>
            ) : null}
          </dl>
          {teacherAssessment.strengths ? (
            <div className="text-sm">
              <p className="text-muted-foreground">Strengths</p>
              <p>{teacherAssessment.strengths}</p>
            </div>
          ) : null}
          {teacherAssessment.areas_to_improve ? (
            <div className="text-sm">
              <p className="text-muted-foreground">Areas to improve</p>
              <p>{teacherAssessment.areas_to_improve}</p>
            </div>
          ) : null}
          {teacherAssessment.remarks ? (
            <div className="text-sm">
              <p className="text-muted-foreground">Other comments</p>
              <p>{teacherAssessment.remarks}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
