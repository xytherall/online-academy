import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/get-site-settings";
import { FALLBACK_ACADEMY_NAME } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const academyName = settings?.academy_name?.trim() || FALLBACK_ACADEMY_NAME;
  return {
    title: `Apply | ${academyName}`,
    description: `Apply to ${academyName}.`,
  };
}

// Placeholder for Stage 9B, which adds the real application form (SPEC §6).
export default function ApplyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-4 py-16 text-center sm:px-6">
      <h1 className="text-3xl font-semibold">Applications open soon</h1>
      <p className="text-muted-foreground">
        The online application form is being finished. Please check back shortly, or use the contact
        details on our Contact page to reach us in the meantime.
      </p>
    </div>
  );
}
