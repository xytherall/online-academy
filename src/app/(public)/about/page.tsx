import type { Metadata } from "next";
import { EmptyState } from "@/components/admin/empty-state";
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
    description: settings?.about_text?.trim()?.slice(0, 160) || `About ${academyName}.`,
  });
}

export default async function AboutPage() {
  const settings = await getSiteSettings();
  const aboutText = settings?.about_text?.trim();

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader eyebrow="About" title="About us" />
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 pb-[72px] sm:px-6 sm:pb-[104px]">
        {aboutText ? (
          <p className="whitespace-pre-line text-muted-foreground">{aboutText}</p>
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
