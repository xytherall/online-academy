import type { Metadata } from "next";
import { PortalShell } from "@/components/portal/portal-shell";
import { NotificationBell } from "@/components/student/notification-bell";
import { StudentMobileNav } from "@/components/student/student-mobile-nav";
import { StudentSidebar } from "@/components/student/student-sidebar";
import { countUnreadAnnouncements } from "@/lib/announcements";
import { requireStudent } from "@/lib/auth";
import { displayName } from "@/lib/display-name";
import { getSiteSettings } from "@/lib/get-site-settings";
import { getBellCount } from "@/lib/notifications";
import { FALLBACK_SITE_LABEL } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const academyName = settings?.academy_name?.trim() || FALLBACK_SITE_LABEL;
  return {
    // `default` (not the template) covers /student itself — its page.tsx is
    // the same route segment as this layout, so the template below never
    // applies to it (only to pages in a nested segment, e.g. /student/courses).
    title: { template: `%s · ${academyName}`, default: `Dashboard · ${academyName}` },
    robots: { index: false, follow: false },
  };
}

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  // Enforced here in server code, not only in the proxy.
  const profile = await requireStudent();
  const supabase = await createClient();
  const [unreadAnnouncements, bellCount] = await Promise.all([
    countUnreadAnnouncements(supabase, profile),
    getBellCount(supabase, profile),
  ]);

  return (
    <PortalShell
      headerActions={<NotificationBell initialCount={bellCount} />}
      mobileNav={<StudentMobileNav unreadAnnouncements={unreadAnnouncements} />}
      sidebar={<StudentSidebar unreadAnnouncements={unreadAnnouncements} />}
      userLabel="Portal"
      userName={displayName(profile)}
    >
      {children}
    </PortalShell>
  );
}
