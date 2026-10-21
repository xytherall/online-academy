/**
 * The canonical public site URL, used for `metadataBase`, canonical links and
 * Open Graph URLs. Prefers NEXT_PUBLIC_SITE_URL; on Netlify falls back to
 * `URL` (the site's main address, set by Netlify) so link previews never point
 * at localhost if the variable is forgotten; localhost in dev.
 */
export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.URL?.trim() || "http://localhost:3000";
  return url.replace(/\/$/, "");
}
