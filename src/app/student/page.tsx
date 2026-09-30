import Link from "next/link";
import { AnnouncementBody } from "@/components/announcement-body";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CourseProgressCard } from "@/components/student/course-progress-card";
import { DashboardBand } from "@/components/student/dashboard-band";
import { EmptyState } from "@/components/admin/empty-state";
import { LocalDateTime } from "@/components/local-date-time";
import { getAnnouncementsForStudent } from "@/lib/announcements";
import { requireStudent } from "@/lib/auth";
import { getBatchName, getDueSoonAssessments, getRecentlyMarked } from "@/lib/student";
import { getStudentCourseReports } from "@/lib/progress-report";
import { createClient } from "@/lib/supabase/server";
import { dueDateBadge } from "@/lib/status-badge";

export default async function StudentDashboard() {
  const profile = await requireStudent();
  const supabase = await createClient();
  const [
    { courses, error },
    batchName,
    { assessments: dueSoon, error: dueSoonError },
    { submissions: recentlyMarked, error: recentlyMarkedError },
    { announcements, error: announcementsError },
  ] = await Promise.all([
    getStudentCourseReports(supabase, profile.id, profile.batch_id),
    getBatchName(profile.batch_id),
    getDueSoonAssessments(profile.id, profile.batch_id),
    getRecentlyMarked(profile.id),
    getAnnouncementsForStudent(3),
  ]);

  return (
    <div className="space-y-8">
      <DashboardBand name={profile.full_name ?? profile.email} batchName={batchName} />

      <div className="-mt-10 sm:-mt-12">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>Could not load your courses. Please refresh the page.</AlertDescription>
          </Alert>
        ) : courses.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map(({ report }) => (
              <CourseProgressCard key={report.course.id} report={report} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No courses yet"
            description="You're not enrolled in any courses yet — contact the academy."
          />
        )}
      </div>

      <div>
        <h2 className="mb-3 font-medium">Due soon</h2>
        {dueSoonError ? (
          <Alert variant="destructive">
            <AlertDescription>Could not load upcoming assignments. Please refresh the page.</AlertDescription>
          </Alert>
        ) : dueSoon && dueSoon.length > 0 ? (
          <ul className="space-y-2">
            {dueSoon.map((assessment) => {
              const { label, variant } = dueDateBadge(assessment.due_at);
              return (
                <li key={assessment.id}>
                  <Link
                    href={`/student/assessments/${assessment.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card p-3 hover:bg-accent/50"
                  >
                    <span className="min-w-0">
                      <span className="font-medium">{assessment.title}</span>
                      {assessment.course ? (
                        <span className="text-sm text-muted-foreground"> · {assessment.course.title}</span>
                      ) : null}
                    </span>
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      Due <LocalDateTime iso={assessment.due_at} />
                      <Badge variant={variant}>{label}</Badge>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="Nothing due soon" description="No assignments due in the next 7 days." />
        )}
      </div>

      <div>
        <h2 className="mb-3 font-medium">Recently marked</h2>
        {recentlyMarkedError ? (
          <Alert variant="destructive">
            <AlertDescription>Could not load recently marked work. Please refresh the page.</AlertDescription>
          </Alert>
        ) : recentlyMarked && recentlyMarked.length > 0 ? (
          <ul className="space-y-2">
            {recentlyMarked
              .flatMap((submission) => (submission.assessment ? [{ ...submission, assessment: submission.assessment }] : []))
              .map((submission) => (
                <li key={submission.id}>
                  <Link
                    href={`/student/assessments/${submission.assessment.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card p-3 hover:bg-accent/50"
                  >
                    <span className="min-w-0">
                      <span className="font-medium">{submission.assessment.title}</span>
                      {submission.assessment.course ? (
                        <span className="text-sm text-muted-foreground"> · {submission.assessment.course.title}</span>
                      ) : null}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {submission.marks} / {submission.assessment.total_marks}
                      </span>
                      <Badge variant="success">Marked</Badge>
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        ) : (
          <EmptyState title="Nothing marked yet" description="Marked work will show up here." />
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">Announcements</h2>
          <Link href="/student/announcements" className="text-sm text-muted-foreground hover:underline">
            View all
          </Link>
        </div>
        {announcementsError ? (
          <Alert variant="destructive">
            <AlertDescription>Could not load announcements. Please refresh the page.</AlertDescription>
          </Alert>
        ) : announcements && announcements.length > 0 ? (
          <ul className="space-y-2">
            {announcements.map((announcement) => (
              <li key={announcement.id} className="rounded-lg border border-border bg-card p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{announcement.title}</span>
                  <span className="text-sm text-muted-foreground">
                    <LocalDateTime iso={announcement.created_at} />
                  </span>
                </div>
                <AnnouncementBody body={announcement.body} className="mt-1 text-sm text-muted-foreground" />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No announcements yet" description="Announcements from the academy will show up here." />
        )}
      </div>
    </div>
  );
}
