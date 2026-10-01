import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { COURSE_LEVEL_LABELS } from "@/lib/group-courses";
import type { PublicCourse } from "@/lib/courses";

/**
 * One large subject card per published course (home page redesign spec,
 * point 4). The decorative symbol is chosen from the course title and is
 * purely visual (aria-hidden) — never a stand-in for real course data.
 */
export function SubjectCard({ course }: { course: PublicCourse }) {
  const excerpt = course.description?.trim().slice(0, 140) ?? "";

  return (
    <article className="relative flex min-h-[280px] flex-col overflow-hidden rounded-3xl border border-border bg-card p-8 sm:p-9">
      <SubjectSymbol title={course.title} />
      <h3 className="relative font-heading text-3xl sm:text-4xl">{course.title}</h3>
      {excerpt ? <p className="relative mt-2.5 max-w-[34ch] text-muted-foreground">{excerpt}</p> : null}
      <div className="relative mt-auto pt-7">
        <Link
          href={`/courses/${course.slug}`}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:border-primary"
        >
          {COURSE_LEVEL_LABELS[course.level]}
          <ArrowRightIcon className="size-4 text-primary" aria-hidden />
        </Link>
      </div>
    </article>
  );
}

function SubjectSymbol({ title }: { title: string }) {
  const lower = title.toLowerCase();

  if (lower.includes("math")) {
    return (
      <span
        aria-hidden
        className="pointer-events-none absolute -right-2 -bottom-16 font-heading text-[260px] leading-none text-primary/[0.08] italic select-none"
      >
        &int;
      </span>
    );
  }

  if (lower.includes("physic")) {
    return (
      <svg
        aria-hidden
        viewBox="0 0 360 160"
        className="pointer-events-none absolute right-[-20px] bottom-6 h-32 w-72 sm:h-40 sm:w-90"
      >
        <path
          d="M0 80 C 30 10, 60 10, 90 80 S 150 150, 180 80 S 240 10, 270 80 S 330 150, 360 80"
          fill="none"
          stroke="var(--primary)"
          strokeOpacity="0.08"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M0 80 C 30 30, 60 30, 90 80 S 150 130, 180 80 S 240 30, 270 80 S 330 130, 360 80"
          fill="none"
          stroke="var(--primary)"
          strokeOpacity="0.08"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_70%_70%_at_100%_100%,black,transparent_70%)]"
      style={{
        backgroundImage:
          "linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    />
  );
}
