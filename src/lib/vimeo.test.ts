import { describe, expect, it } from "vitest";
import { notificationHref } from "./notifications-core";
import { lectureSchema } from "./validation/lectures";
import {
  formatDuration,
  fromStoredVimeoId,
  parseVimeoUrl,
  toStoredVimeoId,
  vimeoEmbedUrl,
  vimeoPageUrl,
} from "./vimeo";

describe("parseVimeoUrl", () => {
  it("reads public links", () => {
    expect(parseVimeoUrl("https://vimeo.com/76979871")).toEqual({ id: "76979871", hash: null });
    expect(parseVimeoUrl("https://www.vimeo.com/76979871/")).toEqual({ id: "76979871", hash: null });
    expect(parseVimeoUrl("  vimeo.com/76979871  ")).toEqual({ id: "76979871", hash: null });
    expect(parseVimeoUrl("http://vimeo.com/76979871?share=copy")).toEqual({ id: "76979871", hash: null });
  });

  it("reads unlisted links with their private hash", () => {
    expect(parseVimeoUrl("https://vimeo.com/123456789/abcdef1234")).toEqual({ id: "123456789", hash: "abcdef1234" });
    expect(parseVimeoUrl("https://player.vimeo.com/video/123456789?h=abcdef1234")).toEqual({
      id: "123456789",
      hash: "abcdef1234",
    });
    expect(parseVimeoUrl("https://player.vimeo.com/video/123456789?h=abc&badge=0")).toEqual({
      id: "123456789",
      hash: "abc",
    });
  });

  it("reads player links without a hash", () => {
    expect(parseVimeoUrl("https://player.vimeo.com/video/123456789")).toEqual({ id: "123456789", hash: null });
  });

  it("rejects anything that isn't a Vimeo video link", () => {
    for (const bad of [
      "",
      "https://youtube.com/watch?v=123",
      "https://vimeo.com.evil.com/123",
      "https://evil.com/vimeo.com/123",
      "https://vimeo.com/channels/staffpicks/123",
      "https://vimeo.com/abc",
      "https://vimeo.com/",
      "https://vimeo.com/123/abc/def",
      "https://vimeo.com/123/ab-cd",
      "https://player.vimeo.com/123",
      "https://player.vimeo.com/video/123?h=bad%20hash",
      "javascript:alert(1)//vimeo.com/123",
      "ftp://vimeo.com/123",
      "https://user:pass@vimeo.com/123",
      "https://vimeo.com:8443/123",
      "https://vimeo.com/123 456",
    ]) {
      expect(parseVimeoUrl(bad), bad).toBeNull();
    }
  });
});

describe("stored vimeo_id", () => {
  it("round-trips with and without a hash", () => {
    expect(toStoredVimeoId({ id: "1", hash: null })).toBe("1");
    expect(toStoredVimeoId({ id: "123", hash: "ab12" })).toBe("123:ab12");
    expect(fromStoredVimeoId("123:ab12")).toEqual({ id: "123", hash: "ab12" });
    expect(fromStoredVimeoId("123")).toEqual({ id: "123", hash: null });
  });

  it("refuses malformed stored values", () => {
    expect(fromStoredVimeoId("")).toBeNull();
    expect(fromStoredVimeoId("abc")).toBeNull();
    expect(fromStoredVimeoId("1:2:3")).toBeNull();
    expect(fromStoredVimeoId("1:")).toBeNull();
  });

  it("builds the page and player addresses", () => {
    expect(vimeoPageUrl({ id: "123", hash: null })).toBe("https://vimeo.com/123");
    expect(vimeoPageUrl({ id: "123", hash: "ab12" })).toBe("https://vimeo.com/123/ab12");
    expect(vimeoEmbedUrl({ id: "123", hash: null })).toBe("https://player.vimeo.com/video/123");
    expect(vimeoEmbedUrl({ id: "123", hash: "ab12" })).toBe("https://player.vimeo.com/video/123?h=ab12");
  });
});

describe("formatDuration", () => {
  it("formats minutes and hours", () => {
    expect(formatDuration(62)).toBe("1:02");
    expect(formatDuration(750)).toBe("12:30");
    expect(formatDuration(3723)).toBe("1:02:03");
  });

  it("shows nothing when the length is unknown", () => {
    expect(formatDuration(null)).toBeNull();
    expect(formatDuration(0)).toBeNull();
  });
});

describe("lectureSchema", () => {
  const valid = {
    title: "  Kinematics, part 1  ",
    vimeo_url: "https://vimeo.com/123456789/abcdef1234",
    description: "",
    is_published: "true",
  };

  it("stores the parsed video id and trims the rest", () => {
    const parsed = lectureSchema.parse(valid);
    expect(parsed).toEqual({
      title: "Kinematics, part 1",
      vimeo_url: "123456789:abcdef1234",
      description: null,
      is_published: true,
    });
  });

  it("rejects a non-Vimeo link, a blank title and an over-long note", () => {
    expect(lectureSchema.safeParse({ ...valid, vimeo_url: "https://youtu.be/abc" }).success).toBe(false);
    expect(lectureSchema.safeParse({ ...valid, vimeo_url: "" }).success).toBe(false);
    expect(lectureSchema.safeParse({ ...valid, title: "   " }).success).toBe(false);
    expect(lectureSchema.safeParse({ ...valid, description: "x".repeat(1001) }).success).toBe(false);
    expect(lectureSchema.safeParse({ ...valid, is_published: "yes" }).success).toBe(false);
  });
});

describe("lecture notifications", () => {
  it("open the lecture page", () => {
    expect(
      notificationHref({ kind: "lecture", assessment_id: null, question_id: null, application_id: null, lecture_id: "l1" }),
    ).toBe("/student/lectures/l1");
  });
});
