import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { Eyebrow } from "@/components/eyebrow";
import { BentoGrid } from "@/components/public/bento-grid";
import { FaqSection } from "@/components/public/faq-section";
import { HeroBackground } from "@/components/public/hero-background";
import { HeroCurves } from "@/components/public/hero-curves";
import { HowToJoin } from "@/components/public/how-to-join";
import { PortalPreview } from "@/components/public/portal-preview";
import { Reveal } from "@/components/public/reveal";
import { SubjectCard } from "@/components/public/subject-card";
import { excerpt } from "@/lib/excerpt";
import { parseEmphasis } from "@/lib/parse-emphasis";
import { getPublishedCourses } from "@/lib/courses";
import { getPublishedFaqs } from "@/lib/faqs";
import { getSiteSettings } from "@/lib/get-site-settings";
import { COURSE_LEVEL_LABELS, groupCoursesByLevel } from "@/lib/group-courses";

export default async function HomePage() {
  const [settings, courses, faqs] = await Promise.all([
    getSiteSettings(),
    getPublishedCourses(),
    getPublishedFaqs(),
  ]);
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
      <section className="relative overflow-hidden px-4 pt-[56px] pb-[72px] text-center sm:px-6 sm:pt-[88px] sm:pb-[120px]">
        <HeroBackground />
        <HeroCurves />
        <div className="relative mx-auto max-w-3xl">
          {offeredLevels ? <Eyebrow className="rise">{offeredLevels}</Eyebrow> : null}
          {headline ? (
            <h1 className="rise rise-1 mx-auto mt-[18px] max-w-[15ch] text-[length:clamp(42px,6.6vw,80px)] leading-[1.02]">
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
            <p className="rise rise-2 mx-auto mt-[22px] max-w-[52ch] text-[18px] text-muted-foreground">{subtext}</p>
          ) : null}
          <div className="rise rise-3 mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="marketing" render={<Link href="/apply" />} nativeButton={false}>
              Apply now
            </Button>
            <Button size="marketing" variant="outline" render={<Link href="/courses" />} nativeButton={false}>
              View courses
            </Button>
          </div>
        </div>

        <div className="rise rise-4">
          <PortalPreview />
        </div>
      </section>

      <section className="border-t border-border bg-background-alt px-4 py-[72px] sm:px-6 sm:py-[104px]">
        <Reveal className="mx-auto max-w-5xl">
          <div className="mb-12 max-w-xl space-y-3">
            <Eyebrow>What you get</Eyebrow>
            <h2 className="text-[length:clamp(32px,4.4vw,52px)] leading-[1.06]">
              Everything for your course, in one calm place.
            </h2>
            <p className="text-muted-foreground">
              Classes happen live. Everything around them lives in your portal, so nothing gets lost in a chat
              group.
            </p>
          </div>
          <BentoGrid />
        </Reveal>
      </section>

      <section className="border-t border-border px-4 py-[72px] sm:px-6 sm:py-[104px]">
        <Reveal className="mx-auto max-w-5xl">
          <div className="mb-12 max-w-xl space-y-3">
            <Eyebrow>Subjects</Eyebrow>
            <h2 className="text-[length:clamp(32px,4.4vw,52px)] leading-[1.06]">What we teach</h2>
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
        </Reveal>
      </section>

      <HowToJoin />

      <FaqSection faqs={faqs} />

      <section className="border-t border-border bg-background-alt px-4 py-[72px] text-center sm:px-6 sm:py-[104px]">
        <Reveal className="mx-auto max-w-2xl">
          <h2 className="text-[length:clamp(40px,6vw,72px)] leading-[1.02]">Ready to start?</h2>
          <p className="mt-4 text-lg text-muted-foreground">Applications take a few minutes.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="marketing" render={<Link href="/apply" />} nativeButton={false}>
              Apply now
            </Button>
            <Button size="marketing" variant="outline" render={<Link href="/contact" />} nativeButton={false}>
              Contact us
            </Button>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
