import type { Metadata } from "next";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/public/page-header";
import { CourseGrid } from "@/components/public/course-grid";
import { getPublishedCourses } from "@/lib/courses";
import { getSiteSettings } from "@/lib/get-site-settings";
import { buildPageMetadata } from "@/lib/page-metadata";
import { FALLBACK_SITE_LABEL } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const academyName = settings?.academy_name?.trim() || FALLBACK_SITE_LABEL;
  return buildPageMetadata({
    path: "/courses",
    title: `Courses | ${academyName}`,
    description: settings?.tagline?.trim() || `Courses offered by ${academyName}.`,
  });
}

export default async function CoursesPage() {
  const courses = await getPublishedCourses();

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader eyebrow="Courses" title="Courses" />
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 pb-[72px] sm:px-6 sm:pb-[104px]">
        {courses.length > 0 ? (
          <CourseGrid courses={courses} />
        ) : (
          <EmptyState
            title="No courses published yet"
            description="Check back soon — courses will appear here once they're published."
          />
        )}
      </div>
    </div>
  );
}
