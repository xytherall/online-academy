import { describe, expect, it } from "vitest";
import { computeDonutArcs } from "./donut-chart-math";

const R = 40;
const C = 2 * Math.PI * R;

describe("computeDonutArcs", () => {
  it("returns nothing when every segment is zero", () => {
    expect(computeDonutArcs([{ key: "a", value: 0 }], R)).toEqual([]);
  });

  it("omits zero-value segments", () => {
    const arcs = computeDonutArcs(
      [
        { key: "a", value: 4 },
        { key: "b", value: 0 },
        { key: "c", value: 1 },
      ],
      R,
    );
    expect(arcs.map((a) => a.key)).toEqual(["a", "c"]);
  });

  it("draws a full ring with no gap for a single non-zero segment", () => {
    const arcs = computeDonutArcs([{ key: "a", value: 6 }], R);
    expect(arcs).toEqual([{ key: "a", dasharray: `${C} ${C}`, dashoffset: 0 }]);
  });

  it("splits proportionally with a 2px gap between segments", () => {
    const arcs = computeDonutArcs(
      [
        { key: "a", value: 4 },
        { key: "b", value: 1 },
        { key: "c", value: 1 },
      ],
      R,
      2,
    );

    const usable = C - 2 * 3;
    expect(arcs[0].dasharray).toBe(`${(4 / 6) * usable} ${C - (4 / 6) * usable}`);
    expect(arcs[0].dashoffset).toBe(0);
    expect(arcs[1].dashoffset).toBe(-((4 / 6) * usable + 2));
    expect(arcs[2].dashoffset).toBe(-((4 / 6) * usable + 2 + (1 / 6) * usable + 2));
  });
});
