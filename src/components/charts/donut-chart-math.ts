/** Pure layout math for the donut chart — no DOM. */

export type DonutSegmentInput = {
  key: string;
  value: number;
};

export type DonutArc = {
  key: string;
  /** SVG stroke-dasharray "visible gap" pair for a circle of this circumference. */
  dasharray: string;
  /** SVG stroke-dashoffset, rotation handled by the caller (rotate -90deg start). */
  dashoffset: number;
};

/**
 * Lays out non-zero segments around a ring of the given radius with a fixed
 * pixel gap between adjacent segments. A single non-zero segment draws a
 * full ring (no gap, since there's nothing to gap against).
 */
export function computeDonutArcs(segments: DonutSegmentInput[], radius: number, gapPx = 2): DonutArc[] {
  const circumference = 2 * Math.PI * radius;
  const nonZero = segments.filter((s) => s.value > 0);
  const total = nonZero.reduce((sum, s) => sum + s.value, 0);

  if (total <= 0) return [];

  if (nonZero.length === 1) {
    return [{ key: nonZero[0].key, dasharray: `${circumference} ${circumference}`, dashoffset: 0 }];
  }

  const gapCount = nonZero.length;
  const usableLength = Math.max(0, circumference - gapPx * gapCount);

  let offset = 0;
  const arcs: DonutArc[] = [];
  for (const segment of nonZero) {
    const length = (segment.value / total) * usableLength;
    arcs.push({
      key: segment.key,
      dasharray: `${length} ${circumference - length}`,
      dashoffset: offset === 0 ? 0 : -offset,
    });
    offset += length + gapPx;
  }
  return arcs;
}
