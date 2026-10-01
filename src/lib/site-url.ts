/**
 * The canonical public site URL, used for `metadataBase`, canonical links and
 * Open Graph URLs. Falls back to localhost so metadata never throws in dev
 * when the env var isn't set yet.
 */
export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "")) || "http://localhost:3000";
}
