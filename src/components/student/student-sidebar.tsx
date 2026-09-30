import { StudentNavLinks } from "@/components/student/student-nav-links";

export function StudentSidebar() {
  return (
    <aside className="hidden w-56 shrink-0 border-r border-border px-3 py-6 md:block print:hidden">
      <StudentNavLinks />
    </aside>
  );
}
