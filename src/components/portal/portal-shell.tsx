import type { ReactNode } from "react";
import { AcademyBrand } from "@/components/academy-brand";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { getSiteSettings } from "@/lib/get-site-settings";

/**
 * Shared header + sidebar shell for the student portal and admin area
 * (SPEC §12 "Portal (student + admin)") — the two areas differ only in
 * which nav components they pass in.
 */
export async function PortalShell({
  headerActions,
  mobileNav,
  sidebar,
  userLabel,
  userName,
  children,
}: {
  /** Extra header buttons shown before the theme toggle (e.g. the student notifications bell). */
  headerActions?: ReactNode;
  mobileNav: ReactNode;
  sidebar: ReactNode;
  userLabel: string;
  userName: string;
  children: ReactNode;
}) {
  const settings = await getSiteSettings();

  return (
    <div className="flex flex-1 flex-col bg-background-portal">
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 px-4 py-2.5 backdrop-blur-md sm:px-6 print:hidden">
        <nav className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {mobileNav}
            <div className="flex min-w-0 items-center gap-2">
              <AcademyBrand settings={settings} compact className="min-w-0 truncate font-heading text-base" />
              <Badge variant="secondary" className="hidden font-normal text-muted-foreground lg:inline-flex">
                {userLabel}
              </Badge>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {headerActions}
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
