import type { Metadata } from "next";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { PortalShell } from "@/components/portal/portal-shell";
import { getPendingApplicationCount } from "@/lib/applications";
import { requireAdmin } from "@/lib/auth";
import { displayName } from "@/lib/display-name";
import { getSiteSettings } from "@/lib/get-site-settings";
import { getWaitingQuestionCount } from "@/lib/questions";
import { FALLBACK_SITE_LABEL } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const academyName = settings?.academy_name?.trim() || FALLBACK_SITE_LABEL;
  return {
    // `default` (not the template) covers /admin itself — its page.tsx is the
    // same route segment as this layout, so the template below never applies
    // to it (only to pages in a nested segment, e.g. /admin/courses).
    title: { template: `%s · ${academyName}`, default: `Overview · ${academyName}` },
    robots: { index: false, follow: false },
  };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Enforced here in server code, not only in the proxy.
  const profile = await requireAdmin();

  const supabase = await createClient();
  const [pendingApplications, waitingQuestions] = await Promise.all([
    getPendingApplicationCount(supabase),
    getWaitingQuestionCount(supabase),
  ]);
  const counts = { pendingApplications, waitingQuestions };

  return (
    <PortalShell
      mobileNav={<AdminMobileNav counts={counts} />}
      sidebar={<AdminSidebar counts={counts} />}
      userLabel="Admin"
      userName={displayName(profile)}
    >
      {children}
    </PortalShell>
  );
}
