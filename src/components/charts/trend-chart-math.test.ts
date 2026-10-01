import { describe, expect, it } from "vitest";
import { computeYDomain, pickDotRadius, pickLabelIndices, scaleY } from "./trend-chart-math";

describe("computeYDomain", () => {
  it("defaults to the capped 60-100 domain when there are no points", () => {
    expect(computeYDomain([])).toEqual({ top: 100, bottom: 60, gridLines: [100, 80, 60] });
  });

  it("rounds the bottom down to the nearest 20 below the lowest score", () => {
    expect(computeYDomain([90, 70, 75, 80, 85]).bottom).toBe(60);
  });

  it("is capped at 60 even when the lowest score would round down to more than 60", () => {
    expect(computeYDomain([95, 82]).bottom).toBe(60);
  });

  it("never goes below 0", () => {
    expect(computeYDomain([5]).bottom).toBe(0);
  });

  it("never goes above 60, even for a very high lowest score", () => {
    expect(computeYDomain([99]).bottom).toBe(60);
    expect(computeYDomain([100]).bottom).toBe(60);
  });

  it("builds gridlines every 20 from bottom to top", () => {
    expect(computeYDomain([72]).gridLines).toEqual([100, 80, 60]);
  });
});

describe("scaleY", () => {
  it("places the top value at y=0 and the bottom value at y=height", () => {
    const domain = { top: 100, bottom: 60, gridLines: [100, 80, 60] };
    expect(scaleY(100, domain, 160)).toBe(0);
    expect(scaleY(60, domain, 160)).toBe(160);
    expect(scaleY(80, domain, 160)).toBe(80);
  });

  it("clamps values outside the domain", () => {
    const domain = { top: 100, bottom: 60, gridLines: [100, 80, 60] };
    expect(scaleY(110, domain, 160)).toBe(0);
    expect(scaleY(10, domain, 160)).toBe(160);
  });
});

describe("pickDotRadius", () => {
  it("is 5 for 15 or fewer points", () => {
    expect(pickDotRadius(15)).toBe(5);
    expect(pickDotRadius(1)).toBe(5);
  });

  it("is 4 for more than 15 points", () => {
    expect(pickDotRadius(16)).toBe(4);
  });
});

describe("pickLabelIndices", () => {
  it("returns nothing for zero points", () => {
    expect(pickLabelIndices(0)).toEqual([]);
  });

  it("labels the single point once", () => {
    expect(pickLabelIndices(1)).toEqual([0]);
  });

  it("labels first and last for two points", () => {
    expect(pickLabelIndices(2)).toEqual([0, 1]);
  });

  it("labels first, middle and last without duplicates or overlap", () => {
    expect(pickLabelIndices(5)).toEqual([0, 2, 4]);
    expect(pickLabelIndices(3)).toEqual([0, 1, 2]);
  });

  it("de-duplicates when the middle coincides with an end on an even count", () => {
    const result = pickLabelIndices(4);
    expect(new Set(result).size).toBe(result.length);
    expect(result[0]).toBe(0);
    expect(result[result.length - 1]).toBe(3);
  });
});
