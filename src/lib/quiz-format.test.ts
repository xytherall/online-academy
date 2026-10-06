import { describe, expect, it } from "vitest";
import { parseQuizText, quizQuestionsToText, quizTextProblem } from "./quiz-format";

const FORCE = `Q: What is the SI unit of force?
A) Joule
B) Newton
C) Watt
D) Pascal
Answer: B`;

describe("parseQuizText", () => {
  it("reads the standard format", () => {
    const parsed = parseQuizText(FORCE);
    expect(parsed.errorCount).toBe(0);
    expect(parsed.questions).toEqual([
      { question: "What is the SI unit of force?", options: ["Joule", "Newton", "Watt", "Pascal"], correctIndex: 1 },
    ]);
  });

  it("splits questions on blank lines and handles Windows line endings and extra blank lines", () => {
    const text = `${FORCE}\r\n\r\n\r\nQ: 2 + 2 = ?\r\nA) 3\r\nB) 4\r\nAnswer: B\r\n\r\n`;
    const parsed = parseQuizText(text);
    expect(parsed.questions).toHaveLength(2);
    expect(parsed.questions[1]).toEqual({ question: "2 + 2 = ?", options: ["3", "4"], correctIndex: 1 });
  });

  it("is forgiving about prefixes, case, spacing and markdown bold", () => {
    const text = `**Q1.**   What   is x?
a.  one
b. two
C)   three
**answer: c**

2) Second question
A: yes
B: no
Correct answer: (A)

Question 3: Third
(A) left
(B) right
Ans - b`;
    const parsed = parseQuizText(text);
    expect(parsed.errorCount).toBe(0);
    expect(parsed.questions.map((q) => [q.question, q.correctIndex])).toEqual([
      ["What is x?", 2],
      ["Second question", 0],
      ["Third", 1],
    ]);
    expect(parsed.questions[0].options).toEqual(["one", "two", "three"]);
  });

  it("joins a block split by a stray blank line inside a question", () => {
    const parsed = parseQuizText("Q: Split?\n\nA) yes\nB) no\n\nAnswer: A");
    expect(parsed.errorCount).toBe(0);
    expect(parsed.questions[0]).toEqual({ question: "Split?", options: ["yes", "no"], correctIndex: 0 });
  });

  it("keeps a multi-line question and a wrapped option", () => {
    const parsed = parseQuizText("Q: Line one\nline two\nA) short\nB) a long option\nthat wraps\nAnswer: B");
    expect(parsed.questions[0].question).toBe("Line one line two");
    expect(parsed.questions[0].options[1]).toBe("a long option that wraps");
  });

  it("reports unreadable blocks with a reason instead of dropping them", () => {
    const text = `Here are your questions:

Q: No answer
A) x
B) y

Q: Bad answer
A) x
B) y
Answer: D

Q: One option
A) x
Answer: A

Q: Out of order
A) x
C) y
Answer: A

Q: Seven
A) 1
B) 2
C) 3
D) 4
E) 5
F) 6
Answer: A
Explanation: because`;
    const parsed = parseQuizText(text);
    expect(parsed.questions).toHaveLength(0);
    expect(parsed.blocks.map((b) => (b.ok ? "ok" : b.reason))).toEqual([
      "No options (A), B), …)",
      "No Answer line",
      "Answer D is not one of the options",
      "Needs at least 2 options",
      "Options must be labelled A, B in order",
      'Unexpected text after the Answer line: "Explanation: because"',
    ]);
  });

  it("rejects a seventh option", () => {
    const parsed = parseQuizText("Q: Many\nA) 1\nB) 2\nC) 3\nD) 4\nE) 5\nF) 6\nG) 7\nAnswer: A");
    expect(parsed.blocks[0]).toMatchObject({ ok: false, reason: "Has more than 6 options" });
  });

  it("round-trips through quizQuestionsToText", () => {
    const parsed = parseQuizText(`${FORCE}\n\nQ: 2 + 2 = ?\nA) 3\nB) 4\nAnswer: B`);
    expect(parseQuizText(quizQuestionsToText(parsed.questions)).questions).toEqual(parsed.questions);
  });
});

describe("quizTextProblem", () => {
  it("is null when everything is readable", () => {
    expect(quizTextProblem(parseQuizText(FORCE))).toBeNull();
  });

  it("blocks saving with unreadable blocks or nothing pasted", () => {
    expect(quizTextProblem(parseQuizText(`${FORCE}\n\nQ: x\nA) 1\nB) 2`))).toMatch(/1 question can't be read/);
    expect(quizTextProblem(parseQuizText("   "))).toBe("Paste at least one question.");
  });
});
