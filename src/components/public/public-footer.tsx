import Link from "next/link";
import { AcademyBrand } from "@/components/academy-brand";
import { PublicNavLinks } from "@/components/public/public-nav-links";
import { buildWhatsAppUrl, FALLBACK_SITE_LABEL, type SiteSettings } from "@/lib/settings";

export function PublicFooter({ settings }: { settings: SiteSettings | null }) {
  const tagline = settings?.tagline?.trim();
  const email = settings?.contact_email?.trim();
  const whatsappUrl = settings?.contact_whatsapp ? buildWhatsAppUrl(settings.contact_whatsapp) : null;
  const hasContact = Boolean(email || whatsappUrl);

  return (
    <footer className="border-t border-border bg-background px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr] lg:gap-8">
          <div className="space-y-2.5">
            <AcademyBrand settings={settings} className="font-heading text-2xl text-foreground" />
            {tagline ? <p className="max-w-[30ch] text-sm text-muted-foreground">{tagline}</p> : null}
          </div>

          <FooterColumn title="Explore">
            <PublicNavLinks
              className="flex flex-col gap-2.5"
              linkClassName="text-sm text-muted-foreground hover:text-foreground"
            />
          </FooterColumn>

          <FooterColumn title="Students">
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/apply" className="text-muted-foreground hover:text-foreground">
                  Apply
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-muted-foreground hover:text-foreground">
                  Student login
                </Link>
              </li>
            </ul>
          </FooterColumn>

          {hasContact ? (
            <FooterColumn title="Contact">
              <ul className="space-y-2.5 text-sm">
                {email ? (
                  <li>
                    <a href={`mailto:${email}`} className="text-muted-foreground hover:text-foreground">
                      {email}
                    </a>
                  </li>
                ) : null}
                {whatsappUrl ? (
                  <li>
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      WhatsApp
                    </a>
                  </li>
                ) : null}
              </ul>
            </FooterColumn>
          ) : null}
        </div>

        <div className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} {settings?.academy_name?.trim() || FALLBACK_SITE_LABEL}
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h6 className="mb-3.5 text-[13px] font-medium text-muted-foreground">{title}</h6>
      {children}
    </div>
  );
}
