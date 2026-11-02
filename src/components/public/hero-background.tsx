/**
 * Decorative hero backdrop (SPEC §12, Graph paper redesign): graph paper that
 * slowly drifts, faint axes, a sine wave and a parabola that draw themselves,
 * and a dot that travels along the wave. Purely decorative: aria-hidden,
 * theme tokens only, and still (final state) with reduced motion.
 */
const WAVE = "M0 260 C150 60 300 60 450 260 S750 460 900 260 S1200 60 1350 260";

export function HeroBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="gp-grid gp-pan absolute inset-0" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,transparent_30%,var(--background)_80%)]" />
      <svg
        viewBox="0 0 1350 520"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        className="absolute inset-x-0 top-0 h-[460px] w-full sm:h-[640px]"
      >
        <line x1="0" y1="260" x2="1350" y2="260" stroke="var(--foreground)" strokeOpacity="0.12" />
        <line x1="675" y1="0" x2="675" y2="520" stroke="var(--foreground)" strokeOpacity="0.12" />
        <path
          className="gp-draw"
          pathLength={1}
          d={WAVE}
          stroke="var(--primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          className="gp-draw"
          pathLength={1}
          d="M0 470 Q675 -200 1350 470"
          stroke="var(--accent-warm)"
          strokeOpacity="0.7"
          strokeWidth="1.5"
        />
        <circle className="gp-dot" r="7" fill="var(--primary)" style={{ offsetPath: `path("${WAVE}")` }} />
      </svg>
    </div>
  );
}
