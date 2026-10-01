import type { LucideIcon } from "lucide-react";

export function EmptyState({
  title,
  description,
  action,
  icon: Icon,
  compact,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: LucideIcon;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex min-h-[120px] flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-4 py-5 text-center">
        {Icon ? <Icon className="size-4 text-muted-foreground" aria-hidden /> : null}
        <p className="text-sm text-muted-foreground">{title}</p>
        {action}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-6 py-12 text-center">
      {Icon ? <Icon className="size-6 text-muted-foreground" aria-hidden /> : null}
      <p className="font-medium">{title}</p>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      {action}
    </div>
  );
}
