import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Simple building blocks for portal lists (student and admin): a section
 * heading with an optional action, and one roomy row per item, laid out the
 * same everywhere: title, a quiet details line, and the status on the right.
 */
export function PortalSection({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-xl font-bold tracking-[-0.02em]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function PortalListItem({
  href,
  title,
  details,
  aside,
  children,
}: {
  /** Without an href the row is static (no hover, no chevron). */
  href?: string;
  title: React.ReactNode;
  /** Short lines under the title, e.g. "O Level Maths · Quiz" and the due date. */
  details?: React.ReactNode[];
  /** Status shown on the right, usually a badge or a mark. */
  aside?: React.ReactNode;
  /** Extra content under the details, e.g. an announcement body. */
  children?: React.ReactNode;
}) {
  const body = (
    <>
      <div className="min-w-0 flex-1">
        <p className="leading-snug font-semibold">{title}</p>
        {details?.filter(Boolean).map((line, index) => (
          <p key={index} className="mt-0.5 text-sm text-muted-foreground">
            {line}
          </p>
        ))}
        {children}
      </div>
      {aside ? <div className="flex shrink-0 flex-col items-end gap-1.5 text-sm">{aside}</div> : null}
      {href ? <ChevronRightIcon aria-hidden className="hover-arrow size-4 shrink-0 self-center text-muted-foreground" /> : null}
    </>
  );

  const className = "flex items-start gap-3 rounded-2xl border border-border bg-card p-4";

  return href ? (
    <Link href={href} className={cn(className, "hover-arrow-group transition-colors hover:border-primary/40 hover:bg-accent/40")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/** A titled white card for one part of a portal page (instructions, a form, a result). */
export function PortalPanel({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-3xl border border-border bg-card p-5 sm:p-7", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-heading text-lg font-bold tracking-[-0.01em]">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}