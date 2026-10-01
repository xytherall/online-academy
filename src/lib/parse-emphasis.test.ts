import { describe, expect, it } from "vitest";
import { parseEmphasis } from "./parse-emphasis";

describe("parseEmphasis", () => {
  it("returns a single text part when there are no asterisks", () => {
    expect(parseEmphasis("taught live and properly")).toEqual([
      { type: "text", value: "taught live and properly" },
    ]);
  });

  it("extracts one emphasised part", () => {
    expect(parseEmphasis("Maths and Physics, *taught live* and properly.")).toEqual([
      { type: "text", value: "Maths and Physics, " },
      { type: "emphasis", value: "taught live" },
      { type: "text", value: " and properly." },
    ]);
  });

  it("extracts several emphasised parts", () => {
    expect(parseEmphasis("*O Level* and *A Level*, done properly")).toEqual([
      { type: "emphasis", value: "O Level" },
      { type: "text", value: " and " },
      { type: "emphasis", value: "A Level" },
      { type: "text", value: ", done properly" },
    ]);
  });

  it("shows an unmatched single asterisk as plain text", () => {
    expect(parseEmphasis("5 * 5 is not emphasis")).toEqual([{ type: "text", value: "5 * 5 is not emphasis" }]);
  });

  it("shows an empty ** as plain text", () => {
    expect(parseEmphasis("nothing ** between")).toEqual([{ type: "text", value: "nothing ** between" }]);
  });

  it("handles emphasis at the start of the string", () => {
    expect(parseEmphasis("*taught live*, in small batches")).toEqual([
      { type: "emphasis", value: "taught live" },
      { type: "text", value: ", in small batches" },
    ]);
  });

  it("handles emphasis at the end of the string", () => {
    expect(parseEmphasis("small batches, *taught live*")).toEqual([
      { type: "text", value: "small batches, " },
      { type: "emphasis", value: "taught live" },
    ]);
  });
});
