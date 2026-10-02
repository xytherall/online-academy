import type { Metadata } from "next";
import { getSiteUrl } from "./site-url";

/**
 * Open Graph/Twitter/canonical fields for one public page. Metadata objects
 * aren't deep-merged by Next across layout/page, so every public page that
 * defines its own `generateMetadata` calls this rather than relying on the
 * root layout's defaults for anything but `/`.
 */
export function buildPageMetadata({
  path,
  title,
  description,
}: {
  path: string;
  title: string;
  description: string;
}): Metadata {
  const url = `${getSiteUrl()}${path}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}
