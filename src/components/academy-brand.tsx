import { buildPublicAssetUrl, FALLBACK_SITE_LABEL, type SiteSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

/**
 * Logo + academy name for the headers and footer. A logo uploaded in Admin →
 * Settings wins; otherwise the built-in LIS crest is shown (navy in light
 * mode, white in dark mode so it stays visible on the dark header).
 */
export function AcademyBrand({
  settings,
  className,
  compact = false,
}: {
  settings: SiteSettings | null;
  className?: string;
  /** On phones, show the short name (Admin → Settings) instead of the full name, if one is set. */
  compact?: boolean;
}) {
  const name = settings?.academy_name?.trim() || FALLBACK_SITE_LABEL;
  const shortName = compact ? settings?.short_name?.trim() : undefined;

  return (
    <span className={cn("flex items-center gap-2 font-semibold", className)}>
      {settings?.logo_path ? (
        // eslint-disable-next-line @next/next/no-img-element -- public bucket asset, no remote-pattern config needed
        <img src={buildPublicAssetUrl(settings.logo_path)} alt="" className="h-7 w-7 rounded object-contain" />
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- small static SVG from /public */}
          <img src="/brand/lis-crest.svg" alt="" className="h-8 w-8 dark:hidden" />
          {/* eslint-disable-next-line @next/next/no-img-element -- small static SVG from /public */}
          <img src="/brand/lis-crest-white.svg" alt="" className="hidden h-8 w-8 dark:block" />
        </>
      )}
      {shortName ? (
        <>
          <span className="sm:hidden">{shortName}</span>
          <span className="hidden sm:inline">{name}</span>
        </>
      ) : (
        name
      )}
    </span>
  );
}
