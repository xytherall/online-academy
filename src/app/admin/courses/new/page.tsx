import { CourseForm } from "../course-form";

export default function NewCoursePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">New course</h1>
      <CourseForm mode="create" />
    </div>
  );
}
