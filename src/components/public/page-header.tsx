import { Eyebrow } from "@/components/eyebrow";
import { HeroBackground } from "@/components/public/hero-background";

/**
 * Shared header for public pages other than the home page (Graph paper
 * redesign): eyebrow + big display title over the same drifting graph paper
 * and self-drawing curves as the home hero, at a smaller scale.
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
    <div className="relative isolate overflow-hidden px-4 pt-14 pb-12 text-center sm:px-6 sm:pt-20 sm:pb-16">
      <HeroBackground />
      <div className="relative mx-auto max-w-3xl">
        {eyebrow ? <Eyebrow className="rise">{eyebrow}</Eyebrow> : null}
        <h1 className="rise rise-1 mx-auto mt-4 max-w-[18ch] font-display text-[length:clamp(40px,6vw,72px)] leading-[0.98] font-extrabold tracking-[-0.04em]">
          {title}
        </h1>
        {description ? (
          <p className="rise rise-2 mx-auto mt-5 max-w-[52ch] text-lg leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
