import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/public/page-header";
import { issueApplyToken } from "@/lib/apply-token";
import { getPublishedCourses } from "@/lib/courses";
import { getSiteSettings } from "@/lib/get-site-settings";
import { buildPageMetadata } from "@/lib/page-metadata";
import { FALLBACK_SITE_LABEL } from "@/lib/settings";
import { ApplyForm } from "./apply-form";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const academyName = settings?.academy_name?.trim() || FALLBACK_SITE_LABEL;
  return buildPageMetadata({
    path: "/apply",
    title: `Apply | ${academyName}`,
    description: `Apply to ${academyName}.`,
  });
}

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string | string[] }>;
}) {
  const [{ course: courseParam }, courses] = await Promise.all([
    searchParams,
    getPublishedCourses(),
  ]);

  // Nobody can apply when there is nothing to apply for, and inventing courses
  // to fill the form would be fake data (SPEC §2).
  if (courses.length === 0) {
    return (
      <div className="flex flex-1 flex-col">
        <PageHeader
          eyebrow="Apply"
          title="Applications are not open yet"
          description="There are no courses open for applications at the moment. Please check back soon, or get in touch using the details on our contact page."
        />
        <div className="mx-auto w-full max-w-2xl px-4 pb-[72px] text-center sm:px-6 sm:pb-[104px]">
          <Button
            size="marketing"
            variant="outline"
            render={<Link href="/contact" />}
            nativeButton={false}
          >
            Contact us
          </Button>
        </div>
      </div>
    );
  }

  // ?course=<slug> from the course detail page's Apply button. An unknown or
  // unpublished slug is a stale link, not an error — the form just opens blank.
  const requestedSlug = Array.isArray(courseParam) ? courseParam[0] : courseParam;
  const preselected = requestedSlug
    ? (courses.find((course) => course.slug === requestedSlug) ?? null)
    : null;

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        eyebrow="Apply"
        title="Apply now"
        description="Tell us a little about yourself and which courses you would like to join. We review every application and get back to you with your login details."
      />
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-[72px] sm:px-6 sm:pb-[104px]">
        <ApplyForm
          courses={courses.map((course) => ({
            id: course.id,
            title: course.title,
            level: course.level,
          }))}
          preselectedCourseId={preselected?.id ?? null}
          preselectedLevel={preselected?.level ?? null}
          applyToken={issueApplyToken()}
        />
      </div>
    </div>
  );
}
