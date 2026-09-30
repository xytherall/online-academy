import { cn } from "@/lib/utils";

/** Small uppercase label above a section title (SPEC §12). */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-xs font-semibold tracking-[0.18em] text-primary uppercase", className)}>
      {children}
    </p>
  );
}
