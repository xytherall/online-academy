import { computeDonutArcs } from "./donut-chart-math";

const SIZE = 104;
const CENTER = SIZE / 2;
const RADIUS = 40;
const STROKE = 14;

export type DonutSegment = {
  key: string;
  label: string;
  value: number;
  colorClassName: string;
};

export function DonutChart({
  segments,
  centerLabel,
  centerSublabel,
  ariaLabel,
}: {
  segments: DonutSegment[];
  centerLabel: string;
  centerSublabel: string;
  ariaLabel: string;
}) {
  const arcs = computeDonutArcs(
    segments.map((s) => ({ key: s.key, value: s.value })),
    RADIUS,
  );
  const arcByKey = new Map(arcs.map((arc) => [arc.key, arc]));

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={ariaLabel} className="h-26 w-26 shrink-0">
      <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" className="stroke-border" strokeWidth={STROKE} />
      <g transform={`rotate(-90 ${CENTER} ${CENTER})`} fill="none" strokeWidth={STROKE}>
        {segments.map((segment) => {
          const arc = arcByKey.get(segment.key);
          if (!arc) return null;
          return (
            <circle
              key={segment.key}
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              className={segment.colorClassName}
              strokeDasharray={arc.dasharray}
              strokeDashoffset={arc.dashoffset}
            >
              <title>
                {segment.label}: {segment.value}
              </title>
            </circle>
          );
        })}
      </g>
      <text x={CENTER} y={CENTER - 2} textAnchor="middle" className="fill-foreground font-heading text-2xl">
        {centerLabel}
      </text>
      <text x={CENTER} y={CENTER + 14} textAnchor="middle" className="fill-muted-foreground text-[10px]">
        {centerSublabel}
      </text>
    </svg>
  );
}
