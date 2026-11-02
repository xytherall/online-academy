import { Eyebrow } from "@/components/eyebrow";
import { Reveal } from "@/components/public/reveal";

const STEPS = [
  {
    title: "Apply online",
    description: "Choose your level and subjects, and add a guardian contact.",
  },
  {
    title: "We review it",
    description: "The academy checks your application and places you in a batch.",
  },
  {
    title: "Get your login",
    description: "We send your login details and you can open your portal straight away.",
  },
];

/**
 * "How to join" steps (Graph paper redesign): three graph-paper cards with
 * outlined numbers; the last one is filled to mark the finish.
 */
export function HowToJoin() {
  return (
    <section className="px-4 py-[72px] sm:px-6 sm:py-[104px]">
      <Reveal className="mx-auto max-w-6xl">
        <div className="mb-11 max-w-xl space-y-3">
          <Eyebrow>How to join</Eyebrow>
          <h2 className="font-display text-[length:clamp(36px,4.8vw,60px)] leading-none font-extrabold tracking-[-0.04em]">
            Three steps <em className="font-serif font-medium tracking-[-0.02em] text-primary">to your first class.</em>
          </h2>
          <p className="text-muted-foreground">No account to create yourself. We set everything up for you.</p>
        </div>

        <ol className="grid gap-5 sm:grid-cols-3">
          {STEPS.map((step, index) => {
            const last = index === STEPS.length - 1;
            return (
              <li
                key={step.title}
                className={
                  last
                    ? "gp-grid-band rounded-3xl border border-primary bg-primary p-7 text-primary-foreground"
                    : "gp-grid rounded-3xl border border-border bg-card p-7"
                }
              >
                <span
                  className={
                    last
                      ? "block font-display text-[64px] leading-none font-extrabold text-transparent [-webkit-text-stroke:2px_var(--primary-foreground)]"
                      : "block font-display text-[64px] leading-none font-extrabold text-transparent [-webkit-text-stroke:2px_var(--primary)]"
                  }
                >
                  {index + 1}
                </span>
                <h3 className="mt-4 font-display text-[26px] font-bold tracking-[-0.02em]">{step.title}</h3>
                <p className={last ? "mt-2 leading-relaxed text-primary-foreground/85" : "mt-2 leading-relaxed text-muted-foreground"}>
                  {step.description}
                </p>
              </li>
            );
          })}
        </ol>
      </Reveal>
    </section>
  );
}
