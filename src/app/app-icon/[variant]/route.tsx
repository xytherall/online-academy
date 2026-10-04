import { notFound } from "next/navigation";
import { renderAppIcon } from "@/lib/app-icon";

// Installed-app icons referenced by src/app/manifest.ts. Android needs 192px
// and 512px icons, plus a "maskable" one it can crop to its own shape.
const VARIANTS = {
  "192": { size: 192, maskable: false },
  "512": { size: 512, maskable: false },
  "maskable-512": { size: 512, maskable: true },
} as const;

export async function GET(_request: Request, { params }: { params: Promise<{ variant: string }> }) {
  const { variant } = await params;
  if (!Object.hasOwn(VARIANTS, variant)) notFound();
  return renderAppIcon(VARIANTS[variant as keyof typeof VARIANTS]);
}
