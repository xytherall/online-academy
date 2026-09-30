import { describe, expect, it } from "vitest";
import { linkify } from "./linkify";

describe("linkify", () => {
  it("returns a single text part when there are no URLs", () => {
    expect(linkify("just plain text")).toEqual([{ type: "text", value: "just plain text" }]);
  });

  it("extracts a bare URL", () => {
    expect(linkify("see https://example.com/page for details")).toEqual([
      { type: "text", value: "see " },
      { type: "link", value: "https://example.com/page" },
      { type: "text", value: " for details" },
    ]);
  });

  it("supports http (not just https)", () => {
    expect(linkify("http://example.com")).toEqual([{ type: "link", value: "http://example.com" }]);
  });

  it("strips a trailing period", () => {
    expect(linkify("Visit https://example.com.")).toEqual([
      { type: "text", value: "Visit " },
      { type: "link", value: "https://example.com" },
      { type: "text", value: "." },
    ]);
  });

  it("strips trailing comma, exclamation, question mark, semicolon, colon", () => {
    for (const punctuation of [",", "!", "?", ";", ":"]) {
      expect(linkify(`https://example.com${punctuation}`)).toEqual([
        { type: "link", value: "https://example.com" },
        { type: "text", value: punctuation },
      ]);
    }
  });

  it("strips multiple trailing punctuation characters", () => {
    expect(linkify("https://example.com?!")).toEqual([
      { type: "link", value: "https://example.com" },
      { type: "text", value: "?!" },
    ]);
  });

  it("strips an unbalanced trailing closing paren (markdown-style link)", () => {
    expect(linkify("(see https://example.com/page)")).toEqual([
      { type: "text", value: "(see " },
      { type: "link", value: "https://example.com/page" },
      { type: "text", value: ")" },
    ]);
  });

  it("keeps a balanced trailing closing paren that's part of the URL", () => {
    expect(linkify("https://en.wikipedia.org/wiki/Foo_(bar)")).toEqual([
      { type: "link", value: "https://en.wikipedia.org/wiki/Foo_(bar)" },
    ]);
  });

  it("strips an unbalanced trailing closing bracket", () => {
    expect(linkify("[https://example.com/page]")).toEqual([
      { type: "text", value: "[" },
      { type: "link", value: "https://example.com/page" },
      { type: "text", value: "]" },
    ]);
  });

  it("keeps a balanced trailing closing bracket that's part of the URL", () => {
    expect(linkify("https://example.com/foo[1]")).toEqual([{ type: "link", value: "https://example.com/foo[1]" }]);
  });

  it("handles multiple URLs and preserves line breaks in surrounding text", () => {
    expect(linkify("first https://a.com\nsecond https://b.com.")).toEqual([
      { type: "text", value: "first " },
      { type: "link", value: "https://a.com" },
      { type: "text", value: "\nsecond " },
      { type: "link", value: "https://b.com" },
      { type: "text", value: "." },
    ]);
  });

  it("does not linkify a non-http scheme or plain domain text", () => {
    expect(linkify("email me at test@example.com or visit example.com")).toEqual([
      { type: "text", value: "email me at test@example.com or visit example.com" },
    ]);
  });
});
