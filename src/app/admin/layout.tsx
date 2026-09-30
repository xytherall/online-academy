import type { Metadata } from "next";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { PortalShell } from "@/components/portal/portal-shell";
import { getPendingApplicationCount } from "@/lib/applications";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Enforced here in server code, not only in the proxy.
  const profile = await requireAdmin();

  const supabase = await createClient();
  const pendingApplicationCount = await getPendingApplicationCount(supabase);

  return (
    <PortalShell
      mobileNav={<AdminMobileNav pendingApplicationCount={pendingApplicationCount} />}
      sidebar={<AdminSidebar pendingApplicationCount={pendingApplicationCount} />}
      userLabel="Admin"
      userName={profile.full_name ?? profile.email}
    >
      {children}
    </PortalShell>
  );
}
