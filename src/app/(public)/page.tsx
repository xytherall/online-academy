import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/admin/empty-state";
import { Eyebrow } from "@/components/eyebrow";
import { BentoGrid } from "@/components/public/bento-grid";
import { HeroBackground } from "@/components/public/hero-background";
import { HeroCurves } from "@/components/public/hero-curves";
import { HowToJoin } from "@/components/public/how-to-join";
import { PortalPreview } from "@/components/public/portal-preview";
import { SubjectCard } from "@/components/public/subject-card";
import { excerpt } from "@/lib/excerpt";
import { parseEmphasis } from "@/lib/parse-emphasis";
import { getPublishedCourses } from "@/lib/courses";
import { getSiteSettings } from "@/lib/get-site-settings";
import { COURSE_LEVEL_LABELS, groupCoursesByLevel } from "@/lib/group-courses";

export default async function HomePage() {
  const [settings, courses] = await Promise.all([getSiteSettings(), getPublishedCourses()]);
  // No invented academy name (SPEC §2/§12): a neutral greeting, never a fake name, when unset.
  const academyName = settings?.academy_name?.trim();
  const tagline = settings?.tagline?.trim();
  const headline = tagline || academyName || "";
  const aboutExcerpt = settings?.about_text?.trim();
  const subtext = aboutExcerpt ? excerpt(aboutExcerpt) : "";
  // Real, database-derived levels — never invented (SPEC §2/§12).
  const offeredLevels = groupCoursesByLevel(courses)
    .map(([level]) => COURSE_LEVEL_LABELS[level])
    .join(" · ");

  return (
    <div className="flex flex-1 flex-col">
      <section className="relative overflow-hidden px-4 py-20 text-center sm:px-6 sm:py-28">
        <HeroBackground />
        <HeroCurves />
        <div className="relative mx-auto max-w-3xl">
          {offeredLevels ? <Eyebrow>{offeredLevels}</Eyebrow> : null}
          {headline ? (
            <h1 className="mx-auto mt-4 max-w-[15ch] text-4xl sm:text-6xl lg:text-7xl">
              {parseEmphasis(headline).map((part, index) =>
                part.type === "emphasis" ? (
                  <em key={index} className="text-primary italic">
                    {part.value}
                  </em>
                ) : (
                  <span key={index}>{part.value}</span>
                ),
              )}
            </h1>
          ) : null}
          {subtext ? (
            <p className="mx-auto mt-5 max-w-[52ch] text-lg text-muted-foreground sm:text-xl">{subtext}</p>
          ) : null}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" render={<Link href="/apply" />} nativeButton={false}>
              Apply now
            </Button>
            <Button size="lg" variant="outline" render={<Link href="/courses" />} nativeButton={false}>
              View courses
            </Button>
          </div>

          <PortalPreview />
        </div>
      </section>

      <section className="border-t border-border bg-background-alt px-4 py-20 sm:px-6 sm:py-26">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 max-w-xl space-y-3">
            <Eyebrow>What you get</Eyebrow>
            <h2 className="text-3xl sm:text-5xl">Everything for your course, in one calm place.</h2>
            <p className="text-muted-foreground">
              Classes happen live. Everything around them lives in your portal, so nothing gets lost in a chat
              group.
            </p>
          </div>
          <BentoGrid />
        </div>
      </section>

      <section className="border-t border-border px-4 py-20 sm:px-6 sm:py-26">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 max-w-xl space-y-3">
            <Eyebrow>Subjects</Eyebrow>
            <h2 className="text-3xl sm:text-5xl">What we teach</h2>
          </div>
          {courses.length > 0 ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {courses.map((course) => (
                <SubjectCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No courses published yet"
              description="Check back soon — courses will appear here once they're published."
            />
          )}
        </div>
      </section>

      <HowToJoin />

      <section className="border-t border-border bg-background-alt px-4 py-20 text-center sm:px-6 sm:py-26">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-4xl sm:text-6xl">Ready to start?</h2>
          <p className="mt-4 text-lg text-muted-foreground">Applications take a few minutes.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" render={<Link href="/apply" />} nativeButton={false}>
              Apply now
            </Button>
            <Button size="lg" variant="outline" render={<Link href="/contact" />} nativeButton={false}>
              Contact us
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
