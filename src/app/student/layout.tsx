import type { Metadata } from "next";
import { PortalShell } from "@/components/portal/portal-shell";
import { StudentMobileNav } from "@/components/student/student-mobile-nav";
import { StudentSidebar } from "@/components/student/student-sidebar";
import { requireStudent } from "@/lib/auth";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  // Enforced here in server code, not only in the proxy.
  const profile = await requireStudent();

  return (
    <PortalShell
      mobileNav={<StudentMobileNav />}
      sidebar={<StudentSidebar />}
      userLabel="Student portal"
      userName={profile.full_name ?? profile.email}
    >
      {children}
    </PortalShell>
  );
}
