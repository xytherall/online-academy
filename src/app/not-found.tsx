import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/public/page-header";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";
import { getSiteSettings } from "@/lib/get-site-settings";

export default async function NotFound() {
  const settings = await getSiteSettings();

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader settings={settings} />
      <main className="flex flex-1 flex-col">
        <PageHeader
          eyebrow="404"
          title="Page not found"
          description="The page you're looking for doesn't exist or may have been moved."
        />
        <div className="mx-auto w-full max-w-2xl px-4 pb-[72px] text-center sm:px-6 sm:pb-[104px]">
          <Button size="marketing" render={<Link href="/" />} nativeButton={false}>
            Back to home
          </Button>
        </div>
      </main>
      <PublicFooter settings={settings} />
    </div>
  );
}
