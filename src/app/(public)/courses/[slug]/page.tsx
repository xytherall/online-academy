import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/eyebrow";
import { getPublishedCourseBySlug } from "@/lib/courses";
import { getSiteSettings } from "@/lib/get-site-settings";
import { COURSE_LEVEL_LABELS } from "@/lib/group-courses";
import { FALLBACK_SITE_LABEL } from "@/lib/settings";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [course, settings] = await Promise.all([getPublishedCourseBySlug(slug), getSiteSettings()]);
  const academyName = settings?.academy_name?.trim() || FALLBACK_SITE_LABEL;

  if (!course) return { title: `Course not found | ${academyName}` };

  return {
    title: `${course.title} | ${academyName}`,
    description: course.description?.trim() || `${COURSE_LEVEL_LABELS[course.level]} course at ${academyName}.`,
  };
}

export default async function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await getPublishedCourseBySlug(slug);

  if (!course) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 py-12 sm:px-6">
      <div className="space-y-1">
        <Eyebrow>{COURSE_LEVEL_LABELS[course.level]}</Eyebrow>
        <h1 className="text-3xl sm:text-4xl">{course.title}</h1>
      </div>

      {course.description ? (
        <p className="whitespace-pre-line text-muted-foreground">{course.description}</p>
      ) : null}

      <Button size="lg" render={<Link href={`/apply?course=${course.slug}`} />} nativeButton={false}>
        Apply for this course
      </Button>
    </div>
  );
}
