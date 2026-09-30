import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/eyebrow";
import { issueApplyToken } from "@/lib/apply-token";
import { getPublishedCourses } from "@/lib/courses";
import { getSiteSettings } from "@/lib/get-site-settings";
import { FALLBACK_SITE_LABEL } from "@/lib/settings";
import { ApplyForm } from "./apply-form";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const academyName = settings?.academy_name?.trim() || FALLBACK_SITE_LABEL;
  return {
    title: `Apply | ${academyName}`,
    description: `Apply to ${academyName}.`,
  };
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
      <div className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-4 py-16 text-center sm:px-6">
        <h1 className="text-3xl">Applications are not open yet</h1>
        <p className="text-muted-foreground">
          There are no courses open for applications at the moment. Please check back soon, or get in
          touch using the details on our contact page.
        </p>
        <Button variant="outline" render={<Link href="/contact" />} nativeButton={false}>
          Contact us
        </Button>
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
    <div className="mx-auto w-full max-w-2xl flex-1 space-y-8 px-4 py-12 sm:px-6">
      <div className="space-y-1">
        <Eyebrow>Apply</Eyebrow>
        <h1 className="text-3xl sm:text-4xl">Apply now</h1>
        <p className="pt-1 text-muted-foreground">
          Tell us a little about yourself and which courses you would like to join. We review every
          application and get back to you with your login details.
        </p>
      </div>

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
  );
}
