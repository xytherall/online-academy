import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/public/page-header";
import { getPublishedCourseBySlug } from "@/lib/courses";
import { getSiteSettings } from "@/lib/get-site-settings";
import { COURSE_LEVEL_LABELS } from "@/lib/group-courses";
import { buildPageMetadata } from "@/lib/page-metadata";
import { FALLBACK_SITE_LABEL } from "@/lib/settings";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [course, settings] = await Promise.all([getPublishedCourseBySlug(slug), getSiteSettings()]);
  const academyName = settings?.academy_name?.trim() || FALLBACK_SITE_LABEL;
  const path = `/courses/${slug}`;

  if (!course) return buildPageMetadata({ path, title: `Course not found | ${academyName}`, description: "" });

  return buildPageMetadata({
    path,
    title: `${course.title} | ${academyName}`,
    description: course.description?.trim() || `${COURSE_LEVEL_LABELS[course.level]} course at ${academyName}.`,
  });
}

export default async function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await getPublishedCourseBySlug(slug);

  if (!course) notFound();

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader eyebrow={COURSE_LEVEL_LABELS[course.level]} title={course.title} />
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 pb-[72px] sm:px-6 sm:pb-[104px]">
        {course.description ? (
          <p className="whitespace-pre-line text-muted-foreground">{course.description}</p>
        ) : null}

        <Button
          size="marketing"
          render={<Link href={`/apply?course=${course.slug}`} />}
          nativeButton={false}
        >
          Apply for this course
        </Button>
      </div>
    </div>
  );
}
