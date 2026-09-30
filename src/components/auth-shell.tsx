import Link from "next/link";
import { AcademyBrand } from "@/components/academy-brand";
import { getSiteSettings } from "@/lib/get-site-settings";

/** Shared calm, centered layout for the login and change-password screens. */
export async function AuthShell({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]"
        style={{
          backgroundImage:
            "linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <Link href="/" className="font-heading text-lg">
          <AcademyBrand settings={settings} />
        </Link>
        {children}
      </div>
    </div>
  );
}
