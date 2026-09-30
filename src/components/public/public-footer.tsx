import { AcademyBrand } from "@/components/academy-brand";
import { ContactStrip } from "@/components/public/contact-strip";
import { PublicNavLinks } from "@/components/public/public-nav-links";
import { getSocialLinkEntries } from "@/lib/social-links";
import { FALLBACK_SITE_LABEL, type SiteSettings } from "@/lib/settings";

export function PublicFooter({ settings }: { settings: SiteSettings | null }) {
  const address = settings?.address?.trim();
  const socialLinks = getSocialLinkEntries(settings?.social_links ?? null);

  return (
    <footer className="border-t border-border bg-background-cream px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 text-muted-foreground">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <AcademyBrand settings={settings} className="font-heading text-lg text-foreground" />
            {address ? <p className="max-w-xs text-sm">{address}</p> : null}
          </div>
          <PublicNavLinks className="flex flex-wrap gap-x-5 gap-y-2" />
        </div>

        <ContactStrip settings={settings} />

        {socialLinks.length > 0 ? (
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {socialLinks.map((link) => (
              <a
                key={link.key}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {link.label}
              </a>
            ))}
          </div>
        ) : null}

        <p className="text-xs">
          &copy; {new Date().getFullYear()} {settings?.academy_name?.trim() || FALLBACK_SITE_LABEL}
        </p>
      </div>
    </footer>
  );
}
