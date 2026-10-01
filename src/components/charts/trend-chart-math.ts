/**
 * Pure layout math for the trend chart — no DOM, no date formatting (dates
 * are formatted client-side by the chart component itself; see
 * trend-chart.tsx), so this is safely unit-testable and server/client safe.
 */

export type YDomain = {
  top: number;
  bottom: number;
  /** Gridline values, every 20 from bottom to top inclusive. */
  gridLines: number[];
};

/**
 * Top is always 100. Bottom is the lowest plotted score rounded down to the
 * nearest 20, never below 0, at most 60 — so the chart never looks flatter
 * than the data actually is.
 */
export function computeYDomain(percentages: number[]): YDomain {
  const lowest = percentages.length > 0 ? Math.min(...percentages) : 100;
  const bottom = Math.min(60, Math.max(0, Math.floor(lowest / 20) * 20));
  const gridLines: number[] = [];
  for (let value = 100; value >= bottom; value -= 20) gridLines.push(value);
  return { top: 100, bottom, gridLines };
}

/** Maps a percentage to a Y pixel position within [0, height], inverted (higher % = smaller y). */
export function scaleY(pct: number, domain: YDomain, height: number): number {
  const range = domain.top - domain.bottom;
  if (range <= 0) return height / 2;
  const clamped = Math.min(domain.top, Math.max(domain.bottom, pct));
  return height * (1 - (clamped - domain.bottom) / range);
}

/** Smaller dots once there are enough points that radius-5 dots would crowd each other. */
export function pickDotRadius(pointCount: number): number {
  return pointCount > 15 ? 4 : 5;
}

/**
 * Indices of the points that should carry an X-axis date label: first,
 * middle and last only, never overlapping — a single point labels once.
 */
export function pickLabelIndices(pointCount: number): number[] {
  if (pointCount <= 0) return [];
  if (pointCount === 1) return [0];
  if (pointCount === 2) return [0, pointCount - 1];
  const middle = Math.floor((pointCount - 1) / 2);
  return Array.from(new Set([0, middle, pointCount - 1])).sort((a, b) => a - b);
}
