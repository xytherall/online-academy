import { DonutChart, type DonutSegment } from "@/components/charts/donut-chart";
import { ProgressRing } from "@/components/progress-ring";
import { COURSE_LEVEL_LABELS } from "@/lib/group-courses";
import type { CourseReport, HomeworkSummary } from "@/lib/progress-report";

function HomeworkCard({ homework }: { homework: HomeworkSummary | null }) {
  if (!homework) {
    return (
      <div className="min-w-0 space-y-3 rounded-2xl border border-border p-4">
        <h3 className="text-lg font-heading">Homework handed in</h3>
        <p className="text-sm text-muted-foreground">No homework due yet.</p>
      </div>
    );
  }

  const segments: DonutSegment[] = [
    { key: "onTime", label: "On time", value: homework.onTime, colorClassName: "stroke-success" },
    { key: "late", label: "Late", value: homework.late, colorClassName: "stroke-warning" },
    { key: "missing", label: "Missing", value: homework.missing, colorClassName: "stroke-late" },
  ];

  return (
    <div className="min-w-0 space-y-3 rounded-2xl border border-border p-4">
      <h3 className="text-lg font-heading">Homework handed in</h3>
      <div className="flex items-center gap-4">
        <DonutChart
          segments={segments}
          centerLabel={String(homework.total)}
          centerSublabel="assignments"
          ariaLabel={`${homework.total} assignments: ${homework.onTime} on time, ${homework.late} late, ${homework.missing} missing`}
        />
        <dl className="grid gap-2 text-sm">
          {segments.map((segment) => (
            <div key={segment.key} className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-sm ${segment.colorClassName.replace("stroke-", "bg-")}`}
                aria-hidden="true"
              />
              <dt className="min-w-0">{segment.label}</dt>
              <dd className="ml-auto pl-3 font-semibold tabular-nums">{segment.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="text-xs text-muted-foreground">All subjects, assignments past their due date.</p>
    </div>
  );
}

export function AtAGlance({
  courses,
  homework,
}: {
  courses: CourseReport[];
  homework: HomeworkSummary | null;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {courses.map((report) => (
        <div key={report.course.id} className="min-w-0 space-y-3 rounded-2xl border border-border p-4">
          <div className="flex items-center gap-3">
            {report.totalCount === 0 ? (
              <p className="text-sm text-muted-foreground">No work set yet</p>
            ) : (
              <ProgressRing pct={report.overallPct} size={64} emptyLabel="Not marked yet" />
            )}
            <div className="min-w-0">
              <h3 className="truncate text-lg leading-tight font-heading">{report.course.title}</h3>
              <p className="text-xs text-muted-foreground">
                {COURSE_LEVEL_LABELS[report.course.level]} · Overall score
              </p>
            </div>
          </div>
          {report.totalCount > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-muted px-2.5 py-2">
                <p className="text-[11px] text-muted-foreground">Marked</p>
                <p className="font-semibold tabular-nums">
                  {report.markedCount} of {report.totalCount}
                </p>
              </div>
              <div className="rounded-lg bg-muted px-2.5 py-2">
                <p className="text-[11px] text-muted-foreground">Missing</p>
                <p className="font-semibold tabular-nums">{report.missingCount}</p>
              </div>
            </div>
          ) : null}
        </div>
      ))}
      <HomeworkCard homework={homework} />
    </div>
  );
}
