/**
 * SPEC §12 "Progress indicators": a ring only when there is counted marked
 * work; otherwise the text "No marked work yet" — never a 0% ring, since
 * 0% and "nothing marked yet" must never look the same. `pct` must come
 * from the shared report calculation (`computeCourseReport` /
 * `getStudentCourseReports`), never recomputed here.
 */
export function ProgressRing({ pct, size = 64 }: { pct: number | null; size?: number }) {
  if (pct === null) {
    return <p className="text-sm text-muted-foreground">No marked work yet</p>;
  }

  const strokeWidth = Math.max(4, Math.round(size / 10));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, pct));
  const offset = circumference * (1 - clamped / 100);

  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${pct}% marked`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="fill-none stroke-primary transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none"
        />
      </svg>
      <span className="absolute text-sm font-semibold tabular-nums" aria-hidden="true">
        {pct}%
      </span>
    </div>
  );
}
