/**
 * Decorative maths motif layered over the hero (home page redesign): a faint
 * parabola with a dot at its vertex, a dashed sine wave, and two very light
 * axis lines. Purely decorative — aria-hidden, theme tokens only.
 */
export function HeroCurves() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1440 620"
      preserveAspectRatio="xMidYMin slice"
      fill="none"
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[460px] w-full sm:h-[620px]"
    >
      <path
        d="M220 600 Q720 -260 1220 600"
        stroke="var(--primary)"
        strokeOpacity="0.28"
        strokeWidth="1.5"
      />
      <path
        d="M-20 470 C 160 360, 340 360, 520 470 S 880 580, 1060 470 S 1300 360, 1460 430"
        stroke="var(--primary)"
        strokeOpacity="0.22"
        strokeWidth="1.25"
        strokeDasharray="6 8"
      />
      <line x1="720" y1="40" x2="720" y2="600" stroke="var(--foreground)" strokeOpacity="0.07" strokeWidth="1" />
      <line x1="0" y1="470" x2="1440" y2="470" stroke="var(--foreground)" strokeOpacity="0.07" strokeWidth="1" />
      <circle cx="720" cy="170" r="5" fill="var(--primary)" fillOpacity="0.45" />
    </svg>
  );
}
