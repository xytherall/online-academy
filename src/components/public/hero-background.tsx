/**
 * Decorative hero backdrop (SPEC §12): a soft two-colour glow, a fading
 * graph-paper grid, and a faint parabola/sine motif. Purely decorative —
 * aria-hidden, absolutely positioned behind the hero's real content.
 */
export function HeroBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0 [mask-image:radial-gradient(ellipse_70%_65%_at_50%_45%,black,black_35%,transparent_90%)]"
        style={{
          backgroundImage:
            "linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div
        className="absolute -top-32 left-1/4 h-96 w-96 rounded-full blur-3xl"
        style={{ backgroundColor: "var(--hero-glow-1)" }}
      />
      <div
        className="absolute -top-20 right-1/4 h-96 w-96 rounded-full blur-3xl"
        style={{ backgroundColor: "var(--hero-glow-2)" }}
      />
      <svg
        className="absolute inset-x-0 bottom-0 h-32 w-full text-primary/15"
        viewBox="0 0 1200 200"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M0 140 C 150 40, 300 40, 450 100 S 750 180, 900 100 S 1100 20, 1200 60"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}
