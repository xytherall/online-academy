import type { Metadata } from "next";
import { MailIcon, MessageCircleIcon, MapPinIcon, PhoneIcon } from "lucide-react";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/public/page-header";
import { getSiteSettings } from "@/lib/get-site-settings";
import { buildPageMetadata } from "@/lib/page-metadata";
import { getSocialLinkEntries } from "@/lib/social-links";
import { buildWhatsAppUrl, FALLBACK_SITE_LABEL } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const academyName = settings?.academy_name?.trim() || FALLBACK_SITE_LABEL;
  return buildPageMetadata({
    path: "/contact",
    title: `Contact | ${academyName}`,
    description: `Get in touch with ${academyName}.`,
  });
}

export default async function ContactPage() {
  const settings = await getSiteSettings();
  const email = settings?.contact_email?.trim();
  const phone = settings?.contact_phone?.trim();
  const whatsappUrl = settings?.contact_whatsapp ? buildWhatsAppUrl(settings.contact_whatsapp) : null;
  const address = settings?.address?.trim();
  const socialLinks = getSocialLinkEntries(settings?.social_links ?? null);

  const hasAnyContactInfo = Boolean(email || phone || whatsappUrl || address || socialLinks.length > 0);

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader eyebrow="Contact" title="Get in touch" />
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-[72px] sm:px-6 sm:pb-[104px]">
      {hasAnyContactInfo ? (
        <div className="space-y-4">
          {email ? (
            <a href={`mailto:${email}`} className="flex items-center gap-3 hover:underline">
              <MailIcon className="size-5 text-muted-foreground" aria-hidden />
              {email}
            </a>
          ) : null}
          {phone ? (
            <a href={`tel:${phone}`} className="flex items-center gap-3 hover:underline">
              <PhoneIcon className="size-5 text-muted-foreground" aria-hidden />
              {phone}
            </a>
          ) : null}
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 hover:underline"
            >
              <MessageCircleIcon className="size-5 text-muted-foreground" aria-hidden />
              Chat on WhatsApp
            </a>
          ) : null}
          {address ? (
            <p className="flex items-start gap-3">
              <MapPinIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="whitespace-pre-line text-muted-foreground">{address}</span>
            </p>
          ) : null}
          {socialLinks.length > 0 ? (
            <div className="flex flex-wrap gap-x-5 gap-y-2 pt-2">
              {socialLinks.map((link) => (
                <a
                  key={link.key}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium hover:underline"
                >
                  {link.label}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <EmptyState
          title="Contact details coming soon"
          description="The academy hasn't added contact details yet."
        />
      )}
      </div>
    </div>
  );
}
