// Hero subtext (SPEC home redesign): the first sentence of about_text if it
// ends within ~180 characters, otherwise a word-boundary cut with an
// ellipsis. Text with no sentence-ending punctuation at all falls through to
// the word-boundary cut too.

const MAX_LENGTH = 180;

export function excerpt(text: string, maxLength: number = MAX_LENGTH): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;

  const sentenceMatch = trimmed.match(/^.{1,}?[.!?](?=\s|$)/);
  if (sentenceMatch && sentenceMatch[0].length <= maxLength) {
    return sentenceMatch[0];
  }

  const cut = trimmed.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  const wordBoundary = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
  return `${wordBoundary.trimEnd()}…`;
}
