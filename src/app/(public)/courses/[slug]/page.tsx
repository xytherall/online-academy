import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/public/page-header";
import { getPublishedCourseBySlug } from "@/lib/courses";
import { getSiteSettings } from "@/lib/get-site-settings";
import { COURSE_LEVEL_LABELS } from "@/lib/group-courses";
import { buildPageMetadata } from "@/lib/page-metadata";
import { FALLBACK_SITE_LABEL } from "@/lib/settings";

// The same descriptive copy as the home page's "What you get" section.
const COURSE_INCLUDES = [
  "Live classes on Zoom or Google Meet",
  "Small batches",
  "Notes and past papers in your portal",
  "Assignments and tests, marked with feedback",
  "A progress report parents can read",
];

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
      <div className="mx-auto grid w-full max-w-6xl flex-1 items-start gap-6 px-4 pb-[72px] sm:px-6 sm:pb-[104px] lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-3xl border border-border bg-card p-7 sm:p-9">
          <h2 className="font-display text-2xl font-extrabold tracking-[-0.03em]">About this course</h2>
          {course.description ? (
            <p className="mt-4 leading-relaxed whitespace-pre-line text-muted-foreground">{course.description}</p>
          ) : (
            <p className="mt-4 text-muted-foreground">
              Get in touch for details about what this course covers.
            </p>
          )}
        </div>

        <aside
          className="gp-grid-band relative overflow-hidden rounded-3xl p-7 text-dashboard-band-foreground sm:p-8 lg:sticky lg:top-24"
          style={{ backgroundColor: "var(--dashboard-band-from)" }}
        >
          <h2 className="font-display text-2xl font-extrabold tracking-[-0.03em]">Join this course</h2>
          <ul className="mt-4 space-y-2.5 text-sm text-dashboard-band-foreground/85">
            {COURSE_INCLUDES.map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <CheckIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--tile-glow)]" />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-col gap-2.5">
            {/* text-foreground: the panel's white text would otherwise make this label invisible. */}
            <Button
              size="marketing"
              variant="outline"
              render={<Link href={`/apply?course=${course.slug}`} />}
              nativeButton={false}
              className="border-transparent text-foreground"
            >
              Apply for this course
            </Button>
            <Button
              size="marketing"
              variant="ghost"
              render={<Link href="/contact" />}
              nativeButton={false}
              className="border border-white/35 text-dashboard-band-foreground hover:bg-white/10 hover:text-dashboard-band-foreground"
            >
              Ask a question
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
