import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { COURSE_LEVEL_LABELS, groupCoursesByLevel } from "@/lib/group-courses";
import type { PublicCourse } from "@/lib/courses";

export function CourseGrid({ courses }: { courses: PublicCourse[] }) {
  const grouped = groupCoursesByLevel(courses);

  return (
    <div className="space-y-10">
      {grouped.map(([level, levelCourses]) => (
        <section key={level} className="space-y-3">
          <h3 className="font-heading text-lg">{COURSE_LEVEL_LABELS[level]}</h3>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {levelCourses.map((course) => (
              <li key={course.id}>
                <Link
                  href={`/courses/${course.slug}`}
                  className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-primary-soft"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{course.title}</span>
                    {course.description ? (
                      <span className="block truncate text-sm text-muted-foreground">{course.description}</span>
                    ) : null}
                  </span>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
                    <ArrowRightIcon className="size-4" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
