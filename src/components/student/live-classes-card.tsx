import { ExternalLinkIcon, VideoIcon } from "lucide-react";
import { LocalDateTime } from "@/components/local-date-time";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import type { StudentLiveClass } from "@/lib/live-classes";
import { cn } from "@/lib/utils";

/**
 * Upcoming live classes at the top of the student dashboard. Hidden when
 * there are none (no empty card), since most days there is nothing to show.
 */
export function LiveClassesCard({ liveClasses, error }: { liveClasses: StudentLiveClass[] | null; error: boolean }) {
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Could not load your live classes. Please refresh the page.</AlertDescription>
      </Alert>
    );
  }
  if (!liveClasses || liveClasses.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-4" aria-labelledby="live-classes-heading">
      <h2 id="live-classes-heading" className="mb-3 flex items-center gap-2 font-medium">
        <VideoIcon className="size-4 text-primary" aria-hidden="true" />
        Upcoming live classes
      </h2>
      <ul className="divide-y divide-border">
        {liveClasses.map((liveClass) => (
          <li key={liveClass.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{liveClass.title}</p>
              <p className="text-sm text-muted-foreground">
                <LocalDateTime iso={liveClass.starts_at} />
              </p>
              {liveClass.note ? (
                <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">{liveClass.note}</p>
              ) : null}
            </div>
            <a
              href={liveClass.join_url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ size: "sm" }), "shrink-0")}
            >
              Join
              <ExternalLinkIcon aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
