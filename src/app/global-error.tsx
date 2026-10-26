"use client";

import { Button } from "@/components/ui/button";
import { dmSans, dmSerifDisplay } from "@/lib/fonts";
import "./globals.css";

// Shown only when the root layout itself fails (e.g. the database can't be
// reached), so it renders its own document and can't read site settings.
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en" className={`h-full antialiased ${dmSerifDisplay.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <title>Something went wrong</title>
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
          <h1 className="text-2xl sm:text-3xl">Something went wrong</h1>
          <p className="max-w-md text-muted-foreground">
            The site couldn&apos;t load right now. Please try again in a moment.
          </p>
          <Button onClick={retry}>Try again</Button>
        </main>
      </body>
    </html>
  );
}
