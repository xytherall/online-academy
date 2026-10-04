import type { Metadata } from "next";
import { WifiOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

// Served by the service worker (public/sw.js) in place of any page that
// can't load because the phone is offline. It's cached once and shown with
// no network, so it must not depend on JavaScript or live data.
export const metadata: Metadata = {
  title: "You're offline",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 bg-background-portal px-4 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
        <WifiOffIcon className="size-5" aria-hidden />
      </span>
      <h1 className="text-2xl">You&apos;re offline</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Check your internet connection, then try again. Your courses and work will be here when you&apos;re back online.
      </p>
      {/* A plain link, not a router link: it reloads the page the student was opening and works without JS. */}
      <Button className="mt-3 px-5" render={<a href="" />} nativeButton={false}>
        Try again
      </Button>
    </main>
  );
}
