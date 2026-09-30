import type { PublicCourse } from "@/lib/courses";

export const COURSE_LEVEL_LABELS = { O: "O Level", A: "A Level" } as const;

export function groupCoursesByLevel(courses: PublicCourse[]): [level: "O" | "A", courses: PublicCourse[]][] {
  const levels: ("O" | "A")[] = ["O", "A"];
  return levels
    .map((level) => [level, courses.filter((course) => course.level === level)] as const)
    .filter(([, list]) => list.length > 0)
    .map(([level, list]) => [level, list]);
}
