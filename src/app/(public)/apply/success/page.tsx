import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/public/page-header";
import { getSiteSettings } from "@/lib/get-site-settings";
import { FALLBACK_SITE_LABEL } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const academyName = settings?.academy_name?.trim() || FALLBACK_SITE_LABEL;
  return {
    title: `Application sent | ${academyName}`,
    description: "We have received your application.",
    robots: { index: false, follow: false },
  };
}

export default async function ApplySuccessPage() {
  const settings = await getSiteSettings();
  const contactEmail = settings?.contact_email?.trim();
  const contactPhone = settings?.contact_whatsapp?.trim() || settings?.contact_phone?.trim();
  const hasContact = Boolean(contactEmail || contactPhone);

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        eyebrow="Application sent"
        title="Thank you — your application has been sent"
        description="We have it, and nothing more is needed from you right now."
      />
      <div className="mx-auto w-full max-w-2xl flex-1 space-y-8 px-4 pb-[72px] sm:px-6 sm:pb-[104px]">
      <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-medium">What happens next</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Someone from the academy reviews your application.</li>
          <li>
            If you are accepted, we contact you directly with your login details — your email
            address and a temporary password.
          </li>
          <li>
            You sign in on this site and choose your own password, then you can see your courses,
            study materials, assignments and marks.
          </li>
        </ol>
        <p className="text-sm text-muted-foreground">
          Class times and joining links are arranged with you directly, not through this website.
        </p>
      </div>

      {hasContact ? (
        <p className="text-sm text-muted-foreground">
          If you need to change something on your application, or you have not heard from us, get in
          touch{contactEmail ? ` at ${contactEmail}` : ""}
          {contactEmail && contactPhone ? " or" : ""}
          {contactPhone ? ` on ${contactPhone}` : ""}.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button size="marketing" render={<Link href="/" />} nativeButton={false}>
          Back to home
        </Button>
        <Button
          size="marketing"
          variant="outline"
          render={<Link href="/courses" />}
          nativeButton={false}
        >
          Browse courses
        </Button>
      </div>
      </div>
    </div>
  );
}
