import { Eyebrow } from "@/components/eyebrow";
import { HeroBackground } from "@/components/public/hero-background";

/**
 * Shared hero-style header for public pages other than the home page
 * (SPEC §12): eyebrow + large Fraunces title over the same soft glow and
 * faint grid as the home hero, at a smaller scale. No decorative maths
 * motif — `HeroCurves` is home-page only per SPEC §12.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="relative overflow-hidden px-4 pt-12 pb-10 text-center sm:px-6 sm:pt-16 sm:pb-14">
      <HeroBackground />
      <div className="relative mx-auto max-w-2xl">
        {eyebrow ? <Eyebrow className="rise">{eyebrow}</Eyebrow> : null}
        <h1 className="rise rise-1 mx-auto mt-3 max-w-[20ch] text-[length:clamp(32px,5vw,52px)] leading-[1.05]">{title}</h1>
        {description ? <p className="rise rise-2 mx-auto mt-4 max-w-[52ch] text-muted-foreground">{description}</p> : null}
      </div>
    </div>
  );
}
