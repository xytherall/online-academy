import { describe, expect, it } from "vitest";
import { answerQuestionSchema, askQuestionSchema, GENERAL_COURSE_VALUE } from "./questions";

const courseId = "8f4e2b3c-1a2b-4c3d-8e9f-0a1b2c3d4e5f";

describe("askQuestionSchema", () => {
  it("turns General into no course", () => {
    const parsed = askQuestionSchema.parse({ course_id: GENERAL_COURSE_VALUE, body: " Help ", attachment_path: "" });
    expect(parsed).toEqual({ course_id: null, body: "Help", attachment_path: null });
  });

  it("keeps a course id and attachment path", () => {
    const parsed = askQuestionSchema.parse({ course_id: courseId, body: "Q", attachment_path: "u/f.pdf" });
    expect(parsed).toEqual({ course_id: courseId, body: "Q", attachment_path: "u/f.pdf" });
  });

  it("rejects an empty question and a bad course id", () => {
    expect(askQuestionSchema.safeParse({ course_id: courseId, body: "   ", attachment_path: null }).success).toBe(false);
    expect(askQuestionSchema.safeParse({ course_id: "nope", body: "Q", attachment_path: null }).success).toBe(false);
  });

  it("rejects a question over 5,000 characters", () => {
    const body = "a".repeat(5001);
    expect(askQuestionSchema.safeParse({ course_id: courseId, body, attachment_path: null }).success).toBe(false);
  });
});

describe("answerQuestionSchema", () => {
  it("requires an answer", () => {
    expect(answerQuestionSchema.safeParse({ answer: " ", answer_attachment_path: null }).success).toBe(false);
    expect(answerQuestionSchema.parse({ answer: "Yes", answer_attachment_path: null })).toEqual({
      answer: "Yes",
      answer_attachment_path: null,
    });
  });
});
