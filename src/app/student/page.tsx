import Link from "next/link";
import { BookOpenIcon, CalendarClockIcon, ClipboardCheckIcon, MegaphoneIcon } from "lucide-react";
import { AnnouncementBody } from "@/components/announcement-body";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CourseProgressCard } from "@/components/student/course-progress-card";
import { DashboardBand } from "@/components/student/dashboard-band";
import { InstallAppCard } from "@/components/student/install-app-card";
import { LiveClassesCard } from "@/components/student/live-classes-card";
import { PhoneNotificationsCard } from "@/components/student/phone-notifications-card";
import { PortalListItem, PortalSection } from "@/components/portal/portal-list";
import { EmptyState } from "@/components/empty-state";
import { LocalDateTime } from "@/components/local-date-time";
import { getAnnouncementSeenCutoff, getAnnouncementsForStudent } from "@/lib/announcements";
import { isNew } from "@/lib/announcements-unread";
import { requireStudent } from "@/lib/auth";
import { getUpcomingLiveClasses } from "@/lib/live-classes";
import { getNotificationsEnabled } from "@/lib/notifications";
import { getBatchName, getDueSoonAssessments, getRecentlyMarked } from "@/lib/student";
import { getStudentCourseReports } from "@/lib/progress-report";
import { createClient } from "@/lib/supabase/server";
import { dueDateBadge } from "@/lib/status-badge";
import { assessmentTypeLabel } from "@/lib/assessment-type";

export default async function StudentDashboard() {
  const profile = await requireStudent();
  const supabase = await createClient();
  const [
    { courses, error },
    batchName,
    { assessments: dueSoon, error: dueSoonError },
    { submissions: recentlyMarked, error: recentlyMarkedError },
    { announcements, error: announcementsError },
    announcementCutoff,
    notificationsEnabled,
    { liveClasses, error: liveClassesError },
  ] = await Promise.all([
    getStudentCourseReports(supabase, profile.id, profile.batch_id),
    getBatchName(profile.batch_id),
    getDueSoonAssessments(profile.id, profile.batch_id),
    getRecentlyMarked(profile.id),
    getAnnouncementsForStudent(3),
    getAnnouncementSeenCutoff(supabase, profile),
    getNotificationsEnabled(supabase, profile.id),
    getUpcomingLiveClasses(),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-10">
      <LiveClassesCard liveClasses={liveClasses} error={liveClassesError} />

      <div>
        <DashboardBand name={profile.full_name?.trim() || null} batchName={batchName} />

        <div className="relative z-10 -mt-10 px-4 sm:px-8">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>Could not load your courses. Please refresh the page.</AlertDescription>
            </Alert>
          ) : courses.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {courses.map(({ report }) => (
                <CourseProgressCard key={report.course.id} report={report} />
              ))}
            </div>
          ) : (
            <EmptyState
              compact
              icon={BookOpenIcon}
              title="You're not enrolled in any courses yet"
              description="The academy will enroll you once you're set up."
            />
          )}
        </div>
      </div>

      <InstallAppCard />
      <PhoneNotificationsCard notificationsEnabled={notificationsEnabled} />

      <PortalSection title="Upcoming work">
        {dueSoonError ? (
          <Alert variant="destructive">
            <AlertDescription>Could not load your upcoming work. Please refresh the page.</AlertDescription>
          </Alert>
        ) : dueSoon && dueSoon.length > 0 ? (
          <ul className="space-y-2.5">
            {dueSoon.map((assessment) => {
              const { label, variant } = dueDateBadge(assessment.due_at);
              return (
                <li key={assessment.id}>
                  <PortalListItem
                    href={`/student/assessments/${assessment.id}`}
                    title={assessment.title}
                    details={[
                      [assessment.course?.title, assessmentTypeLabel(assessment.type)].filter(Boolean).join(" · "),
                      <>
                        Due <LocalDateTime iso={assessment.due_at} />
                      </>,
                    ]}
                    aside={<Badge variant={variant}>{label}</Badge>}
                  />
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            compact
            icon={CalendarClockIcon}
            title="Nothing coming up"
            description="New assignments and tests will show up here as your teacher posts them."
          />
        )}
      </PortalSection>

      <PortalSection title="Recently marked">
        {recentlyMarkedError ? (
          <Alert variant="destructive">
            <AlertDescription>Could not load recently marked work. Please refresh the page.</AlertDescription>
          </Alert>
        ) : recentlyMarked && recentlyMarked.length > 0 ? (
          <ul className="space-y-2.5">
            {recentlyMarked
              .flatMap((submission) => (submission.assessment ? [{ ...submission, assessment: submission.assessment }] : []))
              .map((submission) => (
                <li key={submission.id}>
                  <PortalListItem
                    href={`/student/assessments/${submission.assessment.id}`}
                    title={submission.assessment.title}
                    details={[submission.assessment.course?.title]}
                    aside={
                      <span className="font-display text-lg font-bold tabular-nums">
                        {submission.marks}
                        <span className="text-sm font-normal text-muted-foreground"> / {submission.assessment.total_marks}</span>
                      </span>
                    }
                  />
                </li>
              ))}
          </ul>
        ) : (
          <EmptyState
            compact
            icon={ClipboardCheckIcon}
            title="Nothing marked yet"
            description="Marked work and feedback will appear here."
          />
        )}
      </PortalSection>

      <PortalSection
        title="Announcements"
        action={
          <Link href="/student/announcements" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        }
      >
        {announcementsError ? (
          <Alert variant="destructive">
            <AlertDescription>Could not load announcements. Please refresh the page.</AlertDescription>
          </Alert>
        ) : announcements && announcements.length > 0 ? (
          <ul className="space-y-2.5">
            {announcements.map((announcement) => (
              <li key={announcement.id}>
                <PortalListItem
                  title={announcement.title}
                  details={[<LocalDateTime key="date" iso={announcement.created_at} />]}
                  aside={isNew(announcement.created_at, announcementCutoff) ? <Badge variant="info">New</Badge> : null}
                >
                  <AnnouncementBody body={announcement.body} className="mt-2 text-sm text-muted-foreground" />
                </PortalListItem>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            compact
            icon={MegaphoneIcon}
            title="No announcements yet"
            description="Updates from the academy will show up here."
          />
        )}
      </PortalSection>
    </div>
  );
}
