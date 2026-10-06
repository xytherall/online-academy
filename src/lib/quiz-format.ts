/**
 * The quiz paste format (SPEC §15, 2026-10-06), shared by the admin form's
 * Preview and the Server Action that saves it, so what the admin previews is
 * exactly what gets saved. Pure, no Supabase, so it can be unit tested.
 *
 *   Q: What is the SI unit of force?
 *   A) Joule
 *   B) Newton
 *   C) Watt
 *   D) Pascal
 *   Answer: B
 *
 * Questions are separated by blank lines. Forgiving about "Q1." / "1." for
 * "Q:", "A." for "A)", lower case, extra spaces and stray markdown bold, but
 * a block it can't read is reported with a reason, never silently dropped.
 */

export const QUIZ_MIN_OPTIONS = 2;
export const QUIZ_MAX_OPTIONS = 6;
export const QUIZ_MAX_QUESTIONS = 100;
export const QUIZ_MAX_QUESTION_LENGTH = 2000;
export const QUIZ_MAX_OPTION_LENGTH = 500;

const LETTERS = "ABCDEF";

export type QuizQuestion = {
  question: string;
  options: string[];
  /** 0-based index into options. */
  correctIndex: number;
};

export type QuizBlock =
  | { ok: true; text: string; question: QuizQuestion }
  | { ok: false; text: string; reason: string };

export type ParsedQuiz = {
  blocks: QuizBlock[];
  /** Only the readable blocks, in order. */
  questions: QuizQuestion[];
  /** Number of blocks that could not be read. */
  errorCount: number;
};

export function optionLetter(index: number): string {
  return LETTERS[index] ?? "?";
}

/** Strips markdown bold/italic markers and tidies the spacing on one line. */
function cleanLine(line: string): string {
  return line
    .replace(/\*\*|__/g, "")
    .replace(/^\s*[-•]\s+/, "")
    .replace(/^\s*[*_]+|[*_]+\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// "Q:", "Q1.", "Q 1)", "Question 3:", "1.", "1)"
const QUESTION_PREFIX = /^(?:q(?:uestion)?\s*\d*\s*[:.)\-]|\d+\s*[.):])\s*/i;
// "A)", "a.", "(B)", "C:"
const OPTION_LINE = /^\(?([a-f])\s*[).:]\s*(.*)$/i;
// "Answer: B", "answer - b", "Correct answer: (C)", "Ans: D) Watt"
const ANSWER_LINE = /^(?:correct\s+)?(?:answer|ans)\s*[:.\-]?\s*\(?([a-f])(?=$|[\s).:])/i;

function isOptionLine(line: string) {
  return OPTION_LINE.test(line);
}

function isAnswerLine(line: string) {
  return ANSWER_LINE.test(line);
}

/**
 * Splits into blocks on blank lines. A block that starts with an option or
 * answer line is joined to the one before it when that one has no Answer
 * line yet, so a stray blank line inside a question doesn't break it.
 */
function splitBlocks(text: string): string[][] {
  const blocks: string[][] = [];
  let current: string[] = [];

  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = cleanLine(raw);
    if (line === "") {
      if (current.length > 0) blocks.push(current);
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) blocks.push(current);

  const merged: string[][] = [];
  for (const block of blocks) {
    const previous = merged[merged.length - 1];
    const startsMidQuestion = isOptionLine(block[0]) || isAnswerLine(block[0]);
    if (previous && startsMidQuestion && !previous.some(isAnswerLine)) {
      previous.push(...block);
    } else {
      merged.push(block);
    }
  }
  return merged;
}

function parseBlock(lines: string[]): { question: QuizQuestion } | { reason: string } {
  const questionLines: string[] = [];
  const options: { letter: string; text: string }[] = [];
  let answerLetter: string | null = null;

  for (const line of lines) {
    if (answerLetter !== null) {
      return { reason: `Unexpected text after the Answer line: "${line}"` };
    }

    const answer = ANSWER_LINE.exec(line);
    if (answer) {
      answerLetter = answer[1].toUpperCase();
      continue;
    }

    const option = options.length > 0 || questionLines.length > 0 ? OPTION_LINE.exec(line) : null;
    if (option) {
      options.push({ letter: option[1].toUpperCase(), text: option[2].trim() });
      continue;
    }

    if (options.length === QUIZ_MAX_OPTIONS && /^\(?[g-z]\s*[).]/i.test(line)) {
      return { reason: `Has more than ${QUIZ_MAX_OPTIONS} options` };
    }

    if (options.length > 0) {
      // A wrapped option: carry on the previous option's text.
      const last = options[options.length - 1];
      last.text = `${last.text} ${line}`.trim();
    } else {
      questionLines.push(questionLines.length === 0 ? line.replace(QUESTION_PREFIX, "") : line);
    }
  }

  const question = questionLines.join(" ").trim();
  if (question === "") return { reason: "No question text" };
  if (question.length > QUIZ_MAX_QUESTION_LENGTH) {
    return { reason: `Question is longer than ${QUIZ_MAX_QUESTION_LENGTH} characters` };
  }
  if (options.length === 0) return { reason: "No options (A), B), …)" };
  if (options.length < QUIZ_MIN_OPTIONS) return { reason: `Needs at least ${QUIZ_MIN_OPTIONS} options` };
  if (options.length > QUIZ_MAX_OPTIONS) return { reason: `Has more than ${QUIZ_MAX_OPTIONS} options` };

  for (const [index, option] of options.entries()) {
    if (option.letter !== optionLetter(index)) {
      return { reason: `Options must be labelled ${LETTERS.slice(0, options.length).split("").join(", ")} in order` };
    }
    if (option.text === "") return { reason: `Option ${option.letter} is empty` };
    if (option.text.length > QUIZ_MAX_OPTION_LENGTH) {
      return { reason: `Option ${option.letter} is longer than ${QUIZ_MAX_OPTION_LENGTH} characters` };
    }
  }

  if (answerLetter === null) return { reason: "No Answer line" };
  const correctIndex = LETTERS.indexOf(answerLetter);
  if (correctIndex < 0 || correctIndex >= options.length) {
    return { reason: `Answer ${answerLetter} is not one of the options` };
  }

  return { question: { question, options: options.map((o) => o.text), correctIndex } };
}

export function parseQuizText(text: string): ParsedQuiz {
  const blocks: QuizBlock[] = splitBlocks(text).map((lines) => {
    const blockText = lines.join("\n");
    const result = parseBlock(lines);
    return "question" in result
      ? { ok: true, text: blockText, question: result.question }
      : { ok: false, text: blockText, reason: result.reason };
  });

  const questions = blocks.flatMap((block) => (block.ok ? [block.question] : []));
  return { blocks, questions, errorCount: blocks.length - questions.length };
}

/**
 * Checks the whole paste is ready to save: at least one question, none
 * unreadable, not too many. Returns the user-facing problem, or null.
 */
export function quizTextProblem(parsed: ParsedQuiz): string | null {
  if (parsed.errorCount > 0) {
    return parsed.errorCount === 1
      ? "1 question can't be read. Fix it (see Preview) and try again."
      : `${parsed.errorCount} questions can't be read. Fix them (see Preview) and try again.`;
  }
  if (parsed.questions.length === 0) return "Paste at least one question.";
  if (parsed.questions.length > QUIZ_MAX_QUESTIONS) {
    return `A quiz can have at most ${QUIZ_MAX_QUESTIONS} questions.`;
  }
  return null;
}

/** Turns saved questions back into the paste format, for editing. */
export function quizQuestionsToText(questions: QuizQuestion[]): string {
  return questions
    .map((q) =>
      [
        `Q: ${q.question}`,
        ...q.options.map((option, index) => `${optionLetter(index)}) ${option}`),
        `Answer: ${optionLetter(q.correctIndex)}`,
      ].join("\n"),
    )
    .join("\n\n");
}

/**
 * Copied by the "Copy ChatGPT prompt" button (owner request, 2026-10-06): the
 * teacher pastes it into a normal ChatGPT chat, fills in the topic, and the
 * reply comes back in the paste format above.
 */
export const CHATGPT_QUIZ_PROMPT = `You write multiple-choice quiz questions for Cambridge O Level and A Level students.
Topic, level, number of questions and difficulty: [WRITE HERE]
If something is missing, assume O Level, 10 questions, medium difficulty, and do not ask.
Rules: exactly 4 options labelled A) B) C) D), only one correct; believable wrong options; short clear questions; plain text maths (x^2, sqrt(2), 3 x 10^8); no images or tables; work out each answer before writing it; spread correct answers across A-D.
Output ONLY the questions in exactly this format, one blank line between questions, nothing before or after, no explanations, no markdown:
Q: <question>
A) <option>
B) <option>
C) <option>
D) <option>
Answer: <letter>`;
