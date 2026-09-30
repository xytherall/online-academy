import type { Metadata } from "next";
import { EmptyState } from "@/components/admin/empty-state";
import { getSiteSettings } from "@/lib/get-site-settings";
import { FALLBACK_ACADEMY_NAME } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const academyName = settings?.academy_name?.trim() || FALLBACK_ACADEMY_NAME;
  return {
    title: `About | ${academyName}`,
    description: settings?.about_text?.trim()?.slice(0, 160) || `About ${academyName}.`,
  };
}

export default async function AboutPage() {
  const settings = await getSiteSettings();
  const aboutText = settings?.about_text?.trim();

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold">About</h1>

      {aboutText ? (
        <p className="whitespace-pre-line text-muted-foreground">{aboutText}</p>
      ) : (
        <EmptyState
          title="Nothing here yet"
          description="The academy hasn't added an About page yet. Check back soon."
        />
      )}
    </div>
  );
}
