import { AdminNavLinks } from "@/components/admin/admin-nav-links";

export function AdminSidebar({ pendingApplicationCount }: { pendingApplicationCount: number }) {
  return (
    <aside className="hidden w-56 shrink-0 border-r border-border px-3 py-6 md:block print:hidden">
      <AdminNavLinks pendingApplicationCount={pendingApplicationCount} />
    </aside>
  );
}
