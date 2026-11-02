import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * A row of tabs that are plain links (`?tab=…`), so a long admin page can
 * show one part at a time without any client code. Scrolls sideways on
 * phones instead of wrapping.
 */
export function SectionTabs({
  basePath,
  tabs,
  active,
}: {
  basePath: string;
  tabs: { id: string; label: string; count?: number }[];
  active: string;
}) {
  return (
    <nav aria-label="Sections" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-1 rounded-full border border-border bg-card p-1">
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <li key={tab.id}>
              <Link
                href={`${basePath}?tab=${tab.id}`}
                aria-current={isActive ? "page" : undefined}
                scroll={false}
                className={cn(
                  "flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors",
                  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {tab.label}
                {tab.count !== undefined ? (
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-xs tabular-nums",
                      isActive ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {tab.count}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
