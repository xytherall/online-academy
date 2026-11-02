import { SubjectCard } from "@/components/public/subject-card";
import { COURSE_LEVEL_LABELS, groupCoursesByLevel } from "@/lib/group-courses";
import type { PublicCourse } from "@/lib/courses";

/** Courses page: the home page's course tiles, grouped by level. */
export function CourseGrid({ courses }: { courses: PublicCourse[] }) {
  const grouped = groupCoursesByLevel(courses);
  // Fallback tile colours cycle across the whole page, not per level.
  const tileIndex = new Map(grouped.flatMap(([, levelCourses]) => levelCourses).map((course, i) => [course.id, i]));

  return (
    <div className="space-y-14">
      {grouped.map(([level, levelCourses]) => (
        <section key={level} className="space-y-5">
          <h2 className="font-display text-3xl font-extrabold tracking-[-0.03em]">{COURSE_LEVEL_LABELS[level]}</h2>
          <div className="grid gap-5 lg:grid-cols-2">
            {levelCourses.map((course) => (
              <SubjectCard key={course.id} course={course} index={tileIndex.get(course.id) ?? 0} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
