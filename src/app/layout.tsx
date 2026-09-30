import type { Metadata } from "next";
import Script from "next/script";
import { getSiteSettings } from "@/lib/get-site-settings";
import { FALLBACK_ACADEMY_NAME } from "@/lib/settings";
import { figtree, fraunces } from "@/lib/fonts";
import { THEME_INIT_SCRIPT } from "@/lib/theme-script";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: settings?.academy_name?.trim() || FALLBACK_ACADEMY_NAME,
    description: settings?.tagline?.trim() || "Online O Level / A Level academy",
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
      </body>
    </html>
  );
}
