import Link from "next/link";
import { AcademyBrand } from "@/components/academy-brand";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { PublicMobileNav } from "@/components/public/public-mobile-nav";
import { PublicNavLinks } from "@/components/public/public-nav-links";
import type { SiteSettings } from "@/lib/settings";

export function PublicHeader({ settings }: { settings: SiteSettings | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6">
      <nav className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-4">
        <Link href="/" className="min-w-0 shrink font-display text-lg font-extrabold tracking-[-0.02em]">
          <AcademyBrand settings={settings} compact />
        </Link>
        <PublicNavLinks className="hidden items-center gap-7 lg:flex" />
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <div className="hidden items-center gap-2 lg:flex">
            <Button size="marketing" variant="outline" render={<Link href="/login" />} nativeButton={false}>
              Student login
            </Button>
            <Button size="marketing" variant="dark" render={<Link href="/apply" />} nativeButton={false}>
              Apply now
            </Button>
          </div>
          <Button
            size="sm"
            variant="dark"
            render={<Link href="/apply" />}
            nativeButton={false}
            className="lg:hidden"
          >
            Apply
          </Button>
          <PublicMobileNav />
        </div>
      </nav>
    </header>
  );
}
