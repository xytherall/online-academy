import type { Metadata } from "next";
import { EmptyState } from "@/components/admin/empty-state";
import { CourseGrid } from "@/components/public/course-grid";
import { getPublishedCourses } from "@/lib/courses";
import { getSiteSettings } from "@/lib/get-site-settings";
import { FALLBACK_ACADEMY_NAME } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const academyName = settings?.academy_name?.trim() || FALLBACK_ACADEMY_NAME;
  return {
    title: `Courses | ${academyName}`,
    description: settings?.tagline?.trim() || `Courses offered by ${academyName}.`,
  };
}

export default async function CoursesPage() {
  const courses = await getPublishedCourses();

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-12 sm:px-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Courses</h1>
      </div>

      {courses.length > 0 ? (
        <CourseGrid courses={courses} />
      ) : (
        <EmptyState
          title="No courses published yet"
          description="Check back soon — courses will appear here once they're published."
        />
      )}
    </div>
  );
}
