"use client";

import { formatShortLocalDate } from "@/lib/format-date";
import { useIsClient } from "@/lib/use-is-client";
import { computeYDomain, pickDotRadius, pickLabelIndices, scaleY } from "./trend-chart-math";
import type { TrendPoint } from "@/lib/progress-report";
import { assessmentTypeLabel } from "@/lib/assessment-type";

const WIDTH = 520;
const HEIGHT = 160;
const PLOT_LEFT = 32;
const PLOT_RIGHT = 508;
const PLOT_TOP = 10;
const PLOT_BOTTOM = 134;
const PLOT_HEIGHT = PLOT_BOTTOM - PLOT_TOP;
const LABEL_Y = 154;

function pointX(index: number, count: number): number {
  if (count <= 1) return PLOT_LEFT;
  return PLOT_LEFT + ((PLOT_RIGHT - PLOT_LEFT) * index) / (count - 1);
}

export function TrendChart({ points, averagePct }: { points: TrendPoint[]; averagePct: number | null }) {
  const isClient = useIsClient();
  const domain = computeYDomain(points.map((p) => p.pct));
  const radius = pickDotRadius(points.length);
  const labelIndices = new Set(pickLabelIndices(points.length));

  const coords = points.map((point, index) => ({
    point,
    x: pointX(index, points.length),
    y: PLOT_TOP + scaleY(point.pct, domain, PLOT_HEIGHT),
  }));

  const linePoints = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const averageY = averagePct !== null ? PLOT_TOP + scaleY(averagePct, domain, PLOT_HEIGHT) : null;

  const summary = points
    .map((p) => `${p.pct}${p.hollow ? " (late, not counted)" : ""}`)
    .join(", ");

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`Marks over time: ${summary} percent`}
      className="block w-full"
    >
      {domain.gridLines.map((value) => {
        const y = PLOT_TOP + scaleY(value, domain, PLOT_HEIGHT);
        return (
          <line
            key={value}
            x1={PLOT_LEFT}
            x2={PLOT_RIGHT}
            y1={y}
            y2={y}
            className="stroke-border"
            strokeWidth={1}
          />
        );
      })}
      {domain.gridLines.map((value) => {
        const y = PLOT_TOP + scaleY(value, domain, PLOT_HEIGHT);
        return (
          <text
            key={value}
            x={PLOT_LEFT - 8}
            y={y + 4}
            textAnchor="end"
            className="fill-muted-foreground text-[11px]"
          >
            {value}
          </text>
        );
      })}

      {averageY !== null ? (
        <line
          x1={PLOT_LEFT}
          x2={PLOT_RIGHT}
          y1={averageY}
          y2={averageY}
          className="stroke-muted-foreground/50"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
      ) : null}

      <polyline points={linePoints} fill="none" className="stroke-primary" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

      {coords.map(({ point, x, y }) => (
        <circle
          key={point.assessment.id}
          cx={x}
          cy={y}
          r={radius}
          className={point.hollow ? "fill-card stroke-primary" : "fill-primary stroke-card"}
          strokeWidth={2}
        >
          <title>
            {point.assessment.title}: {assessmentTypeLabel(point.assessment.type)},{" "}
            {point.marks} / {point.assessment.total_marks} · {point.pct}%
            {point.hollow ? " (late, not counted)" : ""}
          </title>
        </circle>
      ))}

      {coords.map(({ point, x }, index) =>
        labelIndices.has(index) ? (
          <text
            key={point.assessment.id}
            x={x}
            y={LABEL_Y}
            textAnchor={index === 0 ? "start" : index === coords.length - 1 ? "end" : "middle"}
            className="fill-muted-foreground text-[11px]"
          >
            {isClient ? formatShortLocalDate(point.assessment.due_at) : "…"}
          </text>
        ) : null,
      )}
    </svg>
  );
}
