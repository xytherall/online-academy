import type { Metadata } from "next";
import { ArrowRightIcon, MailIcon, MessageCircleIcon, MapPinIcon, PhoneIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
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
      <div className="mx-auto w-full max-w-4xl flex-1 px-4 pb-[72px] sm:px-6 sm:pb-[104px]">
      {hasAnyContactInfo ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {whatsappUrl ? (
              <ContactCard
                href={whatsappUrl}
                external
                icon={<MessageCircleIcon className="size-5" aria-hidden />}
                label="WhatsApp"
                value="Chat with us"
              />
            ) : null}
            {email ? (
              <ContactCard href={`mailto:${email}`} icon={<MailIcon className="size-5" aria-hidden />} label="Email" value={email} />
            ) : null}
            {phone ? (
              <ContactCard href={`tel:${phone}`} icon={<PhoneIcon className="size-5" aria-hidden />} label="Phone" value={phone} />
            ) : null}
            {address ? (
              <div className="flex items-start gap-4 rounded-3xl border border-border bg-card p-6">
                <IconCircle>
                  <MapPinIcon className="size-5" aria-hidden />
                </IconCircle>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="mt-0.5 font-semibold whitespace-pre-line">{address}</p>
                </div>
              </div>
            ) : null}
          </div>
          {socialLinks.length > 0 ? (
            <div className="flex flex-wrap gap-2.5">
              {socialLinks.map((link) => (
                <a
                  key={link.key}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
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

function IconCircle({ children }: { children: React.ReactNode }) {
  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">{children}</span>
  );
}

function ContactCard({
  href,
  icon,
  label,
  value,
  external = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="hover-lift hover-arrow-group flex items-center gap-4 rounded-3xl border border-border bg-card p-6"
    >
      <IconCircle>{icon}</IconCircle>
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-muted-foreground">{label}</span>
        <span className="mt-0.5 block truncate font-semibold">{value}</span>
      </span>
      <ArrowRightIcon className="hover-arrow size-4 shrink-0 text-primary" aria-hidden />
    </a>
  );
}