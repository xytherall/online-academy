import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { Eyebrow } from "@/components/eyebrow";
import { BentoGrid } from "@/components/public/bento-grid";
import { FactsMarquee } from "@/components/public/facts-marquee";
import { FaqSection } from "@/components/public/faq-section";
import { HeroBackground } from "@/components/public/hero-background";
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
      <section className="relative isolate overflow-hidden px-4 pt-[64px] pb-[56px] text-center sm:px-6 sm:pt-[104px] sm:pb-[88px]">
        <HeroBackground />
        <div className="relative mx-auto max-w-5xl">
          {offeredLevels ? (
            <p className="rise inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-sm font-semibold">
              <span aria-hidden className="gp-pulse size-2 rounded-full bg-success" />
              {offeredLevels}
            </p>
          ) : null}
          {headline ? (
            <h1 className="rise rise-1 mx-auto mt-6 max-w-[16ch] font-display text-[length:clamp(44px,7.4vw,100px)] leading-[0.95] font-extrabold tracking-[-0.045em]">
              {parseEmphasis(headline).map((part, index) =>
                part.type === "emphasis" ? (
                  <em key={index} className="font-serif font-medium tracking-[-0.02em] text-primary italic">
                    {part.value}
                  </em>
                ) : (
                  <span key={index}>{part.value}</span>
                ),
              )}
            </h1>
          ) : null}
          {subtext ? (
            <p className="rise rise-2 mx-auto mt-6 max-w-[52ch] text-[18px] leading-relaxed text-muted-foreground">
              {subtext}
            </p>
          ) : null}
          <div className="rise rise-3 mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="marketing" render={<Link href="/apply" />} nativeButton={false} className="hover-arrow-group">
              Apply now
              <ArrowRightIcon aria-hidden className="hover-arrow size-4" />
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

      <FactsMarquee />

      <section className="px-4 py-[72px] sm:px-6 sm:py-[104px]">
        <Reveal className="mx-auto max-w-6xl">
          <div className="mb-11 max-w-2xl space-y-3">
            <Eyebrow>What we teach</Eyebrow>
            <h2 className="font-display text-[length:clamp(36px,5vw,64px)] leading-none font-extrabold tracking-[-0.04em]">
              {courses.length > 0 ? "Our courses, " : "Our courses"}
              {courses.length > 0 ? (
                <em className="font-serif font-medium tracking-[-0.02em] text-primary">taught all the way through.</em>
              ) : null}
            </h2>
          </div>
          {courses.length > 0 ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {courses.map((course, index) => (
                <SubjectCard key={course.id} course={course} index={index} />
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

      <section className="border-y border-border bg-background-alt px-4 py-[72px] sm:px-6 sm:py-[104px]">
        <Reveal className="mx-auto max-w-6xl">
          <div className="mb-11 max-w-2xl space-y-3">
            <Eyebrow>What you get</Eyebrow>
            <h2 className="font-display text-[length:clamp(36px,4.8vw,60px)] leading-none font-extrabold tracking-[-0.04em]">
              Everything for your course, <em className="font-serif font-medium tracking-[-0.02em] text-primary">in one place.</em>
            </h2>
            <p className="text-lg leading-relaxed text-muted-foreground">
              Classes happen live. Everything around them lives in your portal, so nothing gets lost in a chat
              group.
            </p>
          </div>
          <BentoGrid />
        </Reveal>
      </section>

      <HowToJoin />

      <FaqSection faqs={faqs} />

      <section className="px-4 pt-8 pb-[72px] sm:px-6 sm:pb-[104px]">
        <Reveal className="mx-auto max-w-6xl">
          <div
            className="relative isolate overflow-hidden rounded-[36px] px-6 py-[72px] text-center text-dashboard-band-foreground sm:px-10 sm:py-[88px]"
            style={{ backgroundColor: "var(--dashboard-band-from)" }}
          >
            <div aria-hidden className="gp-grid-band gp-pan absolute inset-0 -z-10" />
            <svg
              aria-hidden
              viewBox="0 0 1200 400"
              preserveAspectRatio="none"
              fill="none"
              className="absolute inset-0 -z-10 size-full"
            >
              <path
                className="gp-draw"
                pathLength={1}
                d="M0 300 C150 160 300 160 450 300 S750 440 900 300 S1100 180 1200 220"
                stroke="var(--tile-glow)"
                strokeOpacity="0.5"
                strokeWidth="2"
              />
            </svg>
            <h2 className="font-display text-[length:clamp(44px,6vw,80px)] leading-none font-extrabold tracking-[-0.04em]">
              Ready to <em className="font-serif font-medium tracking-[-0.02em] text-[var(--tile-glow)]">start?</em>
            </h2>
            <p className="mt-4 text-lg text-dashboard-band-foreground/75">Applications take a few minutes.</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {/* text-foreground: the panel's white text would otherwise make this label invisible. */}
              <Button
                size="marketing"
                variant="outline"
                render={<Link href="/apply" />}
                nativeButton={false}
                className="border-transparent text-foreground"
              >
                Apply now
              </Button>
              <Button
                size="marketing"
                variant="ghost"
                render={<Link href="/contact" />}
                nativeButton={false}
                className="border border-white/35 text-dashboard-band-foreground hover:bg-white/10 hover:text-dashboard-band-foreground"
              >
                Contact us
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
