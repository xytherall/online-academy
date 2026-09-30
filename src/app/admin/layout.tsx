import type { Metadata } from "next";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { LogoutButton } from "@/components/logout-button";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Enforced here in server code, not only in the proxy.
  const profile = await requireAdmin();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border px-6 py-4 print:hidden">
        <nav className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AdminMobileNav />
            <span className="font-semibold">Admin</span>
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
        <AdminSidebar />
        <main className="flex flex-1 flex-col px-6 py-8 print:p-0">{children}</main>
      </div>
    </div>
  );
}
