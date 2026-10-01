import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { COURSE_LEVEL_LABELS, groupCoursesByLevel } from "@/lib/group-courses";
import type { PublicCourse } from "@/lib/courses";

export function CourseGrid({ courses }: { courses: PublicCourse[] }) {
  const grouped = groupCoursesByLevel(courses);

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-x-12">
      {grouped.map(([level, levelCourses]) => (
        <section key={level} className="space-y-3">
          <h3 className="font-heading text-lg">{COURSE_LEVEL_LABELS[level]}</h3>
          <ul className="divide-y divide-border border-t border-border">
            {levelCourses.map((course) => (
              <li key={course.id}>
                <Link
                  href={`/courses/${course.slug}`}
                  className="group hover-arrow-group flex items-center justify-between gap-4 py-4 transition-colors hover:text-primary"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-heading text-lg">{course.title}</span>
                    <span className="block text-sm text-muted-foreground">{COURSE_LEVEL_LABELS[level]}</span>
                  </span>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
                    <ArrowRightIcon className="hover-arrow size-4" aria-hidden />
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
