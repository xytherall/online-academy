import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/public/page-header";
import { getSiteSettings } from "@/lib/get-site-settings";
import { buildPageMetadata } from "@/lib/page-metadata";
import { FALLBACK_SITE_LABEL } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const academyName = settings?.academy_name?.trim() || FALLBACK_SITE_LABEL;
  return buildPageMetadata({
    path: "/about",
    title: `About | ${academyName}`,
    description: settings?.about_page_text?.trim()?.slice(0, 160) || `About ${academyName}.`,
  });
}

export default async function AboutPage() {
  const settings = await getSiteSettings();
  const aboutText = settings?.about_page_text?.trim();
  // The first paragraph reads as the lead; the rest is body text.
  const [lead, ...rest] = aboutText ? aboutText.split(/\r?\n\s*\r?\n/).map((part) => part.trim()) : [];

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader eyebrow="About" title="About us" />
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 pb-[72px] sm:px-6 sm:pb-[104px]">
        {lead ? (
          <div className="rounded-3xl border border-border bg-card p-7 sm:p-10">
            <p className="font-display text-[length:clamp(22px,2.6vw,28px)] leading-snug font-bold tracking-[-0.02em] whitespace-pre-line">
              {lead}
            </p>
            <div className="mt-6 space-y-4 leading-relaxed text-muted-foreground">
              {rest.map((paragraph, index) => (
                <p key={index} className="whitespace-pre-line">
                  {paragraph}
                </p>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3 border-t border-border pt-6">
              <Button size="marketing" render={<Link href="/apply" />} nativeButton={false}>
                Apply now
              </Button>
              <Button size="marketing" variant="outline" render={<Link href="/contact" />} nativeButton={false}>
                Contact us
              </Button>
            </div>
          </div>
        ) : (
          <EmptyState
            title="Nothing here yet"
            description="The academy hasn't added an About page yet. Check back soon."
          />
        )}
      </div>
    </div>
  );
}
