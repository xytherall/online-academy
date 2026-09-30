import { MailIcon, MessageCircleIcon, PhoneIcon } from "lucide-react";
import { buildWhatsAppUrl, type SiteSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

/** Renders only the contact channels that are actually filled in — no placeholders. */
export function ContactStrip({
  settings,
  className,
}: {
  settings: SiteSettings | null;
  className?: string;
}) {
  const email = settings?.contact_email?.trim();
  const phone = settings?.contact_phone?.trim();
  const whatsappUrl = settings?.contact_whatsapp ? buildWhatsAppUrl(settings.contact_whatsapp) : null;

  if (!email && !phone && !whatsappUrl) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-x-6 gap-y-2 text-sm", className)}>
      {email ? (
        <a href={`mailto:${email}`} className="flex items-center gap-2 hover:underline">
          <MailIcon className="size-4" aria-hidden />
          {email}
        </a>
      ) : null}
      {phone ? (
        <a href={`tel:${phone}`} className="flex items-center gap-2 hover:underline">
          <PhoneIcon className="size-4" aria-hidden />
          {phone}
        </a>
      ) : null}
      {whatsappUrl ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:underline"
        >
          <MessageCircleIcon className="size-4" aria-hidden />
          WhatsApp
        </a>
      ) : null}
    </div>
  );
}
