import { linkify } from "@/lib/linkify";

// Plain text with line breaks preserved; http/https URLs are auto-linked
// safely (no HTML rendering — React escaping plus real <a> elements built
// from parsed text, never dangerouslySetInnerHTML).
export function AnnouncementBody({ body, className }: { body: string; className?: string }) {
  return (
    <p className={`whitespace-pre-line ${className ?? ""}`}>
      {linkify(body).map((part, index) =>
        part.type === "link" ? (
          <a
            key={index}
            href={part.value}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:no-underline"
          >
            {part.value}
          </a>
        ) : (
          <span key={index}>{part.value}</span>
        ),
      )}
    </p>
  );
}
