import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/admin/empty-state";
import { Eyebrow } from "@/components/eyebrow";
import { CourseGrid } from "@/components/public/course-grid";
import { ContactStrip } from "@/components/public/contact-strip";
import { HeroBackground } from "@/components/public/hero-background";
import { getPublishedCourses } from "@/lib/courses";
import { getSiteSettings } from "@/lib/get-site-settings";
import { FALLBACK_ACADEMY_NAME } from "@/lib/settings";

const HOW_TO_JOIN_STEPS = [
  {
    title: "Apply online",
    description: "Fill in the application form with your details and the course(s) you're interested in.",
  },
  {
    title: "The academy reviews your application",
    description: "We check your application and get back to you.",
  },
  {
    title: "You receive your login details",
    description: "Once accepted, we share your student portal login so you can get started.",
  },
];

export default async function HomePage() {
  const [settings, courses] = await Promise.all([getSiteSettings(), getPublishedCourses()]);
  const academyName = settings?.academy_name?.trim() || FALLBACK_ACADEMY_NAME;
  const tagline = settings?.tagline?.trim();
  const aboutExcerpt = settings?.about_text?.trim();
  const hasContactInfo = Boolean(
    settings?.contact_email?.trim() || settings?.contact_phone?.trim() || settings?.contact_whatsapp?.trim(),
  );

  return (
    <div className="flex flex-1 flex-col">
      <section className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-28">
        <HeroBackground />
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          <h1 className="text-4xl sm:text-6xl">{academyName}</h1>
          {tagline ? <p className="text-lg text-muted-foreground sm:text-xl">{tagline}</p> : null}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" render={<Link href="/apply" />} nativeButton={false}>
              Apply now
            </Button>
            <Button size="lg" variant="outline" render={<Link href="/login" />} nativeButton={false}>
              Student login
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-background-cream px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="space-y-1">
            <Eyebrow>Courses</Eyebrow>
            <h2 className="text-2xl">Our courses</h2>
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
      </section>

      <section className="border-t border-border px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="space-y-1">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="text-2xl">How to join</h2>
          </div>
          <ol className="grid gap-6 sm:grid-cols-3">
            {HOW_TO_JOIN_STEPS.map((step, index) => (
              <li key={step.title} className="space-y-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <p className="font-medium">{step.title}</p>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {aboutExcerpt ? (
        <section className="border-t border-border bg-background-cream px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-3xl space-y-4">
            <div className="space-y-1">
              <Eyebrow>About</Eyebrow>
              <h2 className="text-2xl">About us</h2>
            </div>
            <p className="line-clamp-4 whitespace-pre-line text-muted-foreground">{aboutExcerpt}</p>
            <Link href="/about" className="inline-block font-medium text-primary hover:underline">
              Read more &rarr;
            </Link>
          </div>
        </section>
      ) : null}

      {hasContactInfo ? (
        <section className="border-t border-border px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-5xl space-y-4">
            <div className="space-y-1">
              <Eyebrow>Contact</Eyebrow>
              <h2 className="text-2xl">Get in touch</h2>
            </div>
            <ContactStrip settings={settings} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
