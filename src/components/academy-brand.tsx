import { buildPublicAssetUrl, FALLBACK_SITE_LABEL, type SiteSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

export function AcademyBrand({
  settings,
  className,
}: {
  settings: SiteSettings | null;
  className?: string;
}) {
  const name = settings?.academy_name?.trim() || FALLBACK_SITE_LABEL;

  return (
    <span className={cn("flex items-center gap-2 font-semibold", className)}>
      {settings?.logo_path ? (
        // eslint-disable-next-line @next/next/no-img-element -- public bucket asset, no remote-pattern config needed
        <img src={buildPublicAssetUrl(settings.logo_path)} alt="" className="h-7 w-7 rounded object-contain" />
      ) : null}
      {name}
    </span>
  );
}
