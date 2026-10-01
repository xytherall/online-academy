import { Eyebrow } from "@/components/eyebrow";

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
 * "How to join" timeline on the navy section (home page redesign spec, point
 * 5) — the same navy gradient tokens as the student dashboard band.
 */
export function HowToJoin() {
  return (
    <section
      className="relative overflow-hidden px-4 py-[72px] text-dashboard-band-foreground sm:px-6 sm:py-[104px]"
      style={{ backgroundImage: "linear-gradient(135deg, var(--dashboard-band-from), var(--dashboard-band-to))" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_70%_80%_at_80%_20%,black,transparent_70%)]"
        style={{
          backgroundImage:
            "linear-gradient(var(--grid-line-band) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line-band) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <div className="relative mx-auto max-w-5xl">
        <div className="mb-12 max-w-xl space-y-3">
          <Eyebrow>How to join</Eyebrow>
          <h2 className="text-[length:clamp(32px,4.4vw,52px)] leading-[1.06]">Three steps to your first class.</h2>
          <p className="text-dashboard-band-foreground/70">No account to create yourself. We set everything up for you.</p>
        </div>

        <ol className="relative grid gap-10 sm:grid-cols-3 sm:gap-8">
          <div
            aria-hidden
            className="absolute top-[26px] right-[16%] left-[26px] hidden h-px bg-dashboard-band-foreground/25 sm:block"
          />
          {STEPS.map((step, index) => (
            <li key={step.title} className="grid grid-cols-[52px_1fr] items-start gap-x-4 gap-y-2 sm:block">
              <span
                className="relative row-span-2 grid size-13 shrink-0 place-items-center rounded-full border border-dashboard-band-foreground/40 font-heading text-xl sm:mb-3"
                style={{ backgroundColor: "var(--dashboard-band-from)" }}
              >
                {index + 1}
              </span>
              <h3 className="font-heading text-2xl">{step.title}</h3>
              <p className="max-w-[30ch] text-sm text-dashboard-band-foreground/70">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
