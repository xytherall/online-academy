import type { ReactNode } from "react";
import { AcademyBrand } from "@/components/academy-brand";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { getSiteSettings } from "@/lib/get-site-settings";

/**
 * Shared header + sidebar shell for the student portal and admin area
 * (SPEC §12 "Portal (student + admin)") — the two areas differ only in
 * which nav components they pass in.
 */
export async function PortalShell({
  mobileNav,
  sidebar,
  userLabel,
  userName,
  children,
}: {
  mobileNav: ReactNode;
  sidebar: ReactNode;
  userLabel: string;
  userName: string;
  children: ReactNode;
}) {
  const settings = await getSiteSettings();

  return (
    <div className="flex flex-1 flex-col bg-background-portal">
      <header className="border-b border-border bg-card px-4 py-3 sm:px-6 print:hidden">
        <nav className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {mobileNav}
            <div className="flex items-center gap-2">
              <AcademyBrand settings={settings} className="font-heading text-base" />
              <span className="hidden text-sm text-muted-foreground sm:inline">· {userLabel}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <span className="hidden text-sm text-muted-foreground md:inline">{userName}</span>
            <LogoutButton />
          </div>
        </nav>
      </header>
      <div className="flex flex-1">
        {sidebar}
        <main className="flex min-w-0 flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8 print:p-0">{children}</main>
      </div>
    </div>
  );
}
