import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";
import { WhatsAppButton } from "@/components/public/whatsapp-button";
import { getSiteSettings } from "@/lib/get-site-settings";
import { buildWhatsAppUrl, FALLBACK_SITE_LABEL } from "@/lib/settings";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  const academyName = settings?.academy_name?.trim() || FALLBACK_SITE_LABEL;
  const whatsappUrl = settings?.contact_whatsapp
    ? buildWhatsAppUrl(settings.contact_whatsapp, `Hi, I'd like to know more about classes at ${academyName}`)
    : null;

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader settings={settings} />
      <main className="flex flex-1 flex-col">{children}</main>
      <PublicFooter settings={settings} />
      {whatsappUrl ? <WhatsAppButton href={whatsappUrl} /> : null}
    </div>
  );
}
