import Link from "next/link";
import { AcademyBrand } from "@/components/academy-brand";
import { Button } from "@/components/ui/button";
import { PublicMobileNav } from "@/components/public/public-mobile-nav";
import { PublicNavLinks } from "@/components/public/public-nav-links";
import type { SiteSettings } from "@/lib/settings";

export function PublicHeader({ settings }: { settings: SiteSettings | null }) {
  return (
    <header className="border-b border-border px-4 py-4 sm:px-6">
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <Link href="/" className="shrink-0">
          <AcademyBrand settings={settings} />
        </Link>
        <PublicNavLinks className="hidden items-center gap-6 md:flex" />
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 md:flex">
            <Button variant="outline" render={<Link href="/login" />} nativeButton={false}>
              Student login
            </Button>
            <Button render={<Link href="/apply" />} nativeButton={false}>
              Apply now
            </Button>
          </div>
          <PublicMobileNav />
        </div>
      </nav>
    </header>
  );
}
