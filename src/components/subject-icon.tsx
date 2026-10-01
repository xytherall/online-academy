import { AtomIcon, BookOpenIcon, SigmaIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Small consistent subject icon (SPEC pre-launch polish), chosen from the
 * course/subject title — same rule as the home page's decorative
 * `SubjectSymbol` (contains "math" → Maths, contains "physic" → Physics,
 * otherwise a generic book), but a small badge rather than a large
 * background flourish. Used on course cards, course pages and the progress
 * report, in both themes and in print.
 */
export function SubjectIcon({ title, className }: { title: string; className?: string }) {
  const lower = title.toLowerCase();
  const Icon = lower.includes("math") ? SigmaIcon : lower.includes("physic") ? AtomIcon : BookOpenIcon;

  return (
    <span
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary",
        className,
      )}
    >
      <Icon className="size-4" strokeWidth={2} aria-hidden />
    </span>
  );
}
