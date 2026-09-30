import { LogoutButton } from "@/components/logout-button";
import { StudentMobileNav } from "@/components/student/student-mobile-nav";
import { StudentSidebar } from "@/components/student/student-sidebar";
import { requireStudent } from "@/lib/auth";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  // Enforced here in server code, not only in the proxy.
  const profile = await requireStudent();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border px-6 py-4 print:hidden">
        <nav className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <StudentMobileNav />
            <span className="font-semibold">Student portal</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {profile.full_name ?? profile.email}
            </span>
            <LogoutButton />
          </div>
        </nav>
      </header>
      <div className="flex flex-1">
        <StudentSidebar />
        <main className="flex flex-1 flex-col px-6 py-8 print:p-0">{children}</main>
      </div>
    </div>
  );
}
