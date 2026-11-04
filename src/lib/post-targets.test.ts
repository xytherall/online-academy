import { describe, expect, it } from "vitest";
import { namesForIds, postTargetLabel } from "./post-targets";
import { announcementSchema } from "./validation/announcements";

const courseA = "7a2d3c4b-1e0f-4a9b-8c7d-6e5f4a3b2c1d";
const courseB = "8b3e4d5c-2f1a-4b0c-9d8e-7f6a5b4c3d2e";
const batchX = "4f1c2b8e-5a6d-4e3f-9b2a-1c0d7e8f9a0b";
const batchY = "5a2d3c9f-6b7e-4f5a-8c3b-2d1e8f9a0b1c";

describe("postTargetLabel", () => {
  it("says all students when nothing is listed", () => {
    expect(postTargetLabel([], [])).toBe("All students");
  });

  it("lists courses, then batches", () => {
    expect(postTargetLabel(["O Level Maths", "A Level Maths"], ["Batch X"])).toBe(
      "O Level Maths, A Level Maths · Batch X",
    );
    expect(postTargetLabel(["O Level Maths"], [])).toBe("O Level Maths");
    expect(postTargetLabel([], ["Batch X", "Batch Y"])).toBe("Batch X, Batch Y");
  });
});

describe("namesForIds", () => {
  const courses = [
    { id: courseA, title: "A Level Maths" },
    { id: courseB, title: "O Level Maths" },
  ];

  it("keeps the order of the list and falls back for unknown ids", () => {
    expect(namesForIds([courseB, courseA], courses, (c) => c.title, "Course")).toEqual([
      "A Level Maths",
      "O Level Maths",
    ]);
    expect(namesForIds([courseA, batchX], courses, (c) => c.title, "Course")).toEqual(["A Level Maths", "Course"]);
    expect(namesForIds([], courses, (c) => c.title, "Course")).toEqual([]);
  });
});

describe("announcementSchema", () => {
  const valid = { title: "Mock exams", body: "They start next month.", course_ids: [], batch_ids: [] };

  it("accepts all students (no targets)", () => {
    expect(announcementSchema.parse(valid)).toEqual(valid);
  });

  it("accepts several courses and several batches together", () => {
    expect(
      announcementSchema.parse({ ...valid, course_ids: [courseA, courseB], batch_ids: [batchX, batchY] }),
    ).toMatchObject({ course_ids: [courseA, courseB], batch_ids: [batchX, batchY] });
  });

  it("drops duplicates and rejects anything that is not a uuid", () => {
    expect(announcementSchema.parse({ ...valid, batch_ids: [batchX, batchX] }).batch_ids).toEqual([batchX]);
    expect(announcementSchema.safeParse({ ...valid, course_ids: ["everyone"] }).success).toBe(false);
    expect(announcementSchema.safeParse({ ...valid, batch_ids: [""] }).success).toBe(false);
  });

  it("trims and requires the title and body", () => {
    expect(announcementSchema.parse({ ...valid, title: "  Mock exams  " }).title).toBe("Mock exams");
    expect(announcementSchema.safeParse({ ...valid, body: "   " }).success).toBe(false);
  });
});
