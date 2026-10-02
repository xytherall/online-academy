import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";
import { getSiteSettings } from "@/lib/get-site-settings";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader settings={settings} />
      <main className="flex flex-1 flex-col">{children}</main>
      <PublicFooter settings={settings} />
    </div>
  );
}
