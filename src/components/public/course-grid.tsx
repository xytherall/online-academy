import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { COURSE_LEVEL_LABELS, groupCoursesByLevel } from "@/lib/group-courses";
import type { PublicCourse } from "@/lib/courses";

export function CourseGrid({ courses }: { courses: PublicCourse[] }) {
  const grouped = groupCoursesByLevel(courses);

  return (
    <div className="space-y-10">
      {grouped.map(([level, levelCourses]) => (
        <section key={level} className="space-y-4">
          <h3 className="text-lg font-semibold">{COURSE_LEVEL_LABELS[level]}</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {levelCourses.map((course) => (
              <Link key={course.id} href={`/courses/${course.slug}`}>
                <Card className="h-full transition-colors hover:border-brand">
                  <CardHeader>
                    <CardTitle>{course.title}</CardTitle>
                  </CardHeader>
                  {course.description ? (
                    <CardContent>
                      <p className="line-clamp-3 text-sm text-muted-foreground">{course.description}</p>
                    </CardContent>
                  ) : null}
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
