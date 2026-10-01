// Splits a tagline into text/emphasis parts so *word* can render in italic
// primary colour without ever touching dangerouslySetInnerHTML (same part-array
// approach as src/lib/linkify.ts). A single asterisk with no matching partner,
// or a pair with nothing between them ("**"), is left as literal text rather
// than breaking the headline.

export type EmphasisPart = { type: "text"; value: string } | { type: "emphasis"; value: string };

const EMPHASIS_PATTERN = /\*([^*]+)\*/g;

export function parseEmphasis(text: string): EmphasisPart[] {
  const parts: EmphasisPart[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(EMPHASIS_PATTERN)) {
    const start = match.index;
    if (start > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, start) });
    }
    parts.push({ type: "emphasis", value: match[1] });
    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }

  return parts;
}
