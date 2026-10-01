import { LocalDateTime } from "@/components/local-date-time";
import { COURSE_LEVEL_LABELS } from "@/lib/group-courses";
import type { CourseReport, HomeworkSummary, TeacherAssessment } from "@/lib/progress-report";
import { AtAGlance } from "./glance-cards";
import { CourseSection } from "./course-section";

export type ProgressReportData = {
  academyName: string | null;
  logoUrl: string | null;
  studentName: string;
  batchName: string | null;
  country: string | null;
  generatedAtIso: string;
  courses: { report: CourseReport; teacherAssessment: TeacherAssessment }[];
  homework: HomeworkSummary | null;
};

export function ProgressReport({ data }: { data: ProgressReportData }) {
  const levels = Array.from(new Set(data.courses.map(({ report }) => report.course.level)));
  const levelLabel = levels.map((level) => COURSE_LEVEL_LABELS[level]).join(" · ");
  const subjects = data.courses.map(({ report }) => report.course.title).join(", ");

  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-card print:rounded-none print:border-black">
      <header
        className="grid gap-6 px-6 py-8 text-dashboard-band-foreground sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:px-10 print:text-white"
        style={{ backgroundImage: "linear-gradient(120deg, var(--dashboard-band-from), var(--dashboard-band-to))" }}
      >
        <div>
          <div className="flex items-center gap-3 text-sm text-dashboard-band-foreground/80">
            {data.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- public bucket asset
              <img src={data.logoUrl} alt="" className="h-8 w-8 rounded object-contain" />
            ) : null}
            {data.academyName ? <span>{data.academyName}</span> : null}
          </div>
          <h1 className="mt-1.5 text-[clamp(28px,4vw,38px)] text-dashboard-band-foreground">
            Student Progress Report
          </h1>
        </div>
        <div className="text-sm text-dashboard-band-foreground/70 sm:text-right">
          <p>Generated</p>
          <p className="text-[15px] font-medium text-dashboard-band-foreground">
            <LocalDateTime iso={data.generatedAtIso} />
          </p>
        </div>
      </header>

      <dl className="grid grid-cols-2 border-b border-border sm:grid-cols-4 print:border-black">
        <div className="border-r border-b border-border p-4 sm:border-b-0 print:border-black">
          <dt className="text-xs text-muted-foreground">Student</dt>
          <dd className="font-medium">{data.studentName}</dd>
        </div>
        <div className="border-b border-border p-4 sm:border-r sm:border-b-0 print:border-black">
          <dt className="text-xs text-muted-foreground">Level</dt>
          <dd className="font-medium">{levelLabel || "—"}</dd>
        </div>
        {data.batchName ? (
          <div className="border-r border-border p-4 print:border-black">
            <dt className="text-xs text-muted-foreground">Batch</dt>
            <dd className="font-medium">{data.batchName}</dd>
          </div>
        ) : null}
        <div className="p-4">
          <dt className="text-xs text-muted-foreground">Subjects</dt>
          <dd className="font-medium">{subjects || "—"}</dd>
        </div>
      </dl>

      {data.courses.length === 0 ? (
        <p className="p-10 text-sm text-muted-foreground">Not enrolled in any courses yet.</p>
      ) : (
        <>
          <section className="space-y-5 border-b border-border p-6 sm:p-10 print:border-black">
            <div>
              <p className="text-xs font-semibold tracking-wide text-primary uppercase">At a glance</p>
              <h2 className="text-[26px] font-heading">Overall picture</h2>
            </div>
            <AtAGlance courses={data.courses.map((c) => c.report)} homework={data.homework} />
          </section>

          {data.courses.map(({ report, teacherAssessment }, index) => (
            <div key={report.course.id} className="border-b border-border p-6 sm:p-10 print:border-black">
              <CourseSection report={report} teacherAssessment={teacherAssessment} breakBefore={index > 0} />
            </div>
          ))}

          <section className="space-y-1.5 p-6 text-xs text-muted-foreground sm:p-10">
            <p>
              <span className="font-semibold text-foreground">How scores are worked out.</span> Each score is the
              total of marks received divided by the total marks available, for marked work that counts.
            </p>
            <p>
              Late work is not included unless the teacher decides to include it. Missing work is shown separately
              and does not change the score.
            </p>
          </section>
        </>
      )}
    </article>
  );
}
