import { TrendChart } from "@/components/charts/trend-chart";
import { Badge } from "@/components/ui/badge";
import { LocalShortDate } from "@/components/local-short-date";
import { COURSE_LEVEL_LABELS } from "@/lib/group-courses";
import { formatScoreValue, type CourseReport, type TeacherAssessment } from "@/lib/progress-report";
import { reportRowBadge } from "@/lib/status-badge";
import { TeacherAssessmentCard } from "./teacher-assessment";

function ScoreBox({ label, pct, overallPct }: { label: string; pct: number | null; overallPct: number | null }) {
  const { value, caption } = formatScoreValue(pct, overallPct);
  return (
    <div className="min-w-[110px] rounded-xl border border-border px-3.5 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
      {caption ? <p className="text-[11px] text-muted-foreground">{caption}</p> : null}
    </div>
  );
}

export function CourseSection({
  report,
  teacherAssessment,
  breakBefore,
}: {
  report: CourseReport;
  teacherAssessment: TeacherAssessment;
  breakBefore: boolean;
}) {
  const hasFootnote = report.rows.some((row) => row.lateAndUncounted);

  if (report.totalCount === 0) {
    return (
      <section className={`space-y-4 ${breakBefore ? "print:break-before-page" : ""}`}>
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {COURSE_LEVEL_LABELS[report.course.level]}
          </p>
          <h2 className="text-2xl font-heading">{report.course.title}</h2>
        </div>
        <p className="text-sm text-muted-foreground">No work has been set for this course yet.</p>
        <TeacherAssessmentCard assessment={teacherAssessment} />
      </section>
    );
  }

  return (
    <section className={`space-y-6 ${breakBefore ? "print:break-before-page" : ""}`}>
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {COURSE_LEVEL_LABELS[report.course.level]}
          </p>
          <h2 className="text-[28px] font-heading">{report.course.title}</h2>
        </div>
        <div className="ml-auto flex flex-wrap gap-2.5">
          <ScoreBox label="Overall" pct={report.overallPct} overallPct={report.overallPct} />
          <ScoreBox label="Assignments" pct={report.assignmentsPct} overallPct={report.overallPct} />
          <ScoreBox label="Tests" pct={report.testsPct} overallPct={report.overallPct} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="min-w-0 rounded-2xl border border-border p-4">
          <div className="mb-2.5 flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold">Marks over time</h3>
            {report.trend?.averagePct !== null && report.trend ? (
              <span className="text-xs text-muted-foreground">average {Math.round(report.trend.averagePct)}%</span>
            ) : null}
          </div>
          {report.trend ? (
            <TrendChart points={report.trend.points} averagePct={report.trend.averagePct} />
          ) : (
            <p className="flex h-[120px] items-center text-sm text-muted-foreground">
              The trend appears once 3 pieces of work are marked.
            </p>
          )}
        </div>
        <div className="grid min-w-0 content-start gap-2.5">
          {report.strongest ? (
            <div className="rounded-xl bg-success-bg p-3.5">
              <p className="text-[11px] font-semibold tracking-wide text-success uppercase">Strongest</p>
              <p className="font-medium">{report.strongest.assessment.title}</p>
              <p className="text-sm text-muted-foreground">
                {report.strongest.marks} / {report.strongest.assessment.total_marks} ·{" "}
                {report.strongest.percentage}%
              </p>
            </div>
          ) : null}
          {report.weakest ? (
            <div className="rounded-xl bg-warning-bg p-3.5">
              <p className="text-[11px] font-semibold tracking-wide text-warning uppercase">Needs work</p>
              <p className="font-medium">{report.weakest.assessment.title}</p>
              <p className="text-sm text-muted-foreground">
                {report.weakest.marks} / {report.weakest.assessment.total_marks} · {report.weakest.percentage}%
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="min-w-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left print:border-black">
                <th className="py-2 pr-3 font-medium">Assessment</th>
                <th className="py-2 pr-3 font-medium">Due</th>
                <th className="py-2 pr-3 text-right font-medium">Marks</th>
                <th className="py-2 pr-3 text-right font-medium">Score</th>
                <th className="py-2 pr-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row) => {
                const badge = reportRowBadge(row);
                return (
                  <tr key={row.assessment.id} className="border-b border-border/60 print:border-black/40">
                    <td className="py-2.5 pr-3">
                      {row.assessment.title}
                      {row.lateAndUncounted ? <sup className="ml-0.5">*</sup> : null}
                      <div className="text-xs text-muted-foreground capitalize">{row.assessment.type}</div>
                    </td>
                    <td className="py-2.5 pr-3">
                      <LocalShortDate iso={row.assessment.due_at} />
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">
                      {row.submission?.marks != null ? `${row.submission.marks} / ${row.assessment.total_marks}` : "—"}
                    </td>
                    <td className="py-2.5 pr-3">
                      {row.pct !== null ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="block h-1.5 w-[70px] overflow-hidden rounded-full bg-border">
                            <span
                              className="block h-full rounded-full bg-primary"
                              style={{ width: `${Math.min(100, row.pct)}%` }}
                            />
                          </span>
                          <span className="w-11 text-right tabular-nums">{row.pct}%</span>
                        </div>
                      ) : (
                        <span className="block text-right text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {hasFootnote ? (
          <p className="mt-1.5 text-xs text-muted-foreground">
            * Submitted late, so not included in the scores.
          </p>
        ) : null}
      </div>

      <TeacherAssessmentCard assessment={teacherAssessment} />
    </section>
  );
}
