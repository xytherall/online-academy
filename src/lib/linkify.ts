// Splits plain text into a sequence of text/link parts so http(s) URLs can be
// rendered as real anchors while everything else stays a plain text node
// (no dangerouslySetInnerHTML — see src/components/announcement-body.tsx).
// Trailing punctuation that's very unlikely to be part of the URL itself
// (sentence-ending punctuation, or a closing bracket with no matching open
// bracket inside the URL) is trimmed off the link and kept as trailing text.

export type LinkifyPart = { type: "text"; value: string } | { type: "link"; value: string };

const URL_PATTERN = /https?:\/\/[^\s]+/g;
const TRAILING_PUNCTUATION = /[.,!?;:]+$/;
const TRAILING_CLOSING_BRACKETS: Record<string, string> = { ")": "(", "]": "[" };

function trimTrailingPunctuation(url: string): string {
  let trimmed = url;

  let changed = true;
  while (changed) {
    changed = false;

    const punctuationMatch = trimmed.match(TRAILING_PUNCTUATION);
    if (punctuationMatch) {
      trimmed = trimmed.slice(0, -punctuationMatch[0].length);
      changed = true;
      continue;
    }

    const lastChar = trimmed.at(-1);
    const openChar = lastChar ? TRAILING_CLOSING_BRACKETS[lastChar] : undefined;
    if (openChar) {
      const opens = trimmed.split(openChar).length - 1;
      const closes = trimmed.split(lastChar!).length - 1;
      if (closes > opens) {
        trimmed = trimmed.slice(0, -1);
        changed = true;
      }
    }
  }

  return trimmed;
}

export function linkify(text: string): LinkifyPart[] {
  const parts: LinkifyPart[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const raw = match[0];
    const start = match.index;
    const url = trimTrailingPunctuation(raw);
    if (!url) continue;

    if (start > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, start) });
    }
    parts.push({ type: "link", value: url });

    const trailing = raw.slice(url.length);
    if (trailing) {
      parts.push({ type: "text", value: trailing });
    }

    lastIndex = start + raw.length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }

  return parts;
}
