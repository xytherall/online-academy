import type { MetadataRoute } from "next";
import { APP_NAVY, APP_SPLASH_BACKGROUND } from "@/lib/app-icon";
import { getSiteSettings } from "@/lib/get-site-settings";
import { FALLBACK_SITE_LABEL } from "@/lib/settings";

// Makes the site installable as a home-screen app (SPEC §15). The installed
// app opens straight into the portal; logged-out visitors are sent to /login
// by src/proxy.ts and admins on to /admin by the student layout.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSiteSettings().catch(() => null);
  const name = settings?.academy_name?.trim() || FALLBACK_SITE_LABEL;
  const description = settings?.tagline?.trim() || "Online O Level / A Level academy";

  return {
    id: "/",
    name,
    short_name: name,
    description,
    start_url: "/student",
    scope: "/",
    display: "standalone",
    background_color: APP_SPLASH_BACKGROUND,
    theme_color: APP_NAVY,
    icons: [
      { src: "/app-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app-icon/maskable-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
