import type { Metadata } from "next";
import Script from "next/script";
import { AppToaster } from "@/components/app-toaster";
import { getSiteSettings } from "@/lib/get-site-settings";
import { FALLBACK_SITE_LABEL } from "@/lib/settings";
import { getSiteUrl } from "@/lib/site-url";
import { figtree, fraunces } from "@/lib/fonts";
import { THEME_INIT_SCRIPT } from "@/lib/theme-script";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = settings?.academy_name?.trim() || FALLBACK_SITE_LABEL;
  const description = settings?.tagline?.trim() || "Online O Level / A Level academy";
  return {
    metadataBase: new URL(getSiteUrl()),
    title,
    description,
    alternates: { canonical: "/" },
    openGraph: { title, description, url: "/", type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${fraunces.variable} ${figtree.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
