import { Badge } from "@/components/ui/badge";
import { ProgressRing } from "@/components/progress-ring";

/**
 * Static illustration of the student portal for the home hero (home page
 * redesign spec, point 2). The numbers below are sample content for the
 * illustration only — never real student data — hence the caption under it.
 *
 * The two floating cards are positioned against the window itself (not a
 * wider outer box) so the offsets stay predictable regardless of the
 * surrounding container width: they start below the navy band — never
 * covering "Your dashboard" or the batch chip — and are allowed to overlap
 * the course-card row, matching the mockup's stacked-card illustration.
 */
export function PortalPreview() {
  return (
    <div className="mx-auto mt-16 max-w-3xl text-left">
      <div className="relative mx-auto max-w-xl pb-28 sm:pb-32">
        <div className="relative z-10 overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-elevated)]">
          <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
            <span className="size-2 rounded-full bg-border" />
            <span className="size-2 rounded-full bg-border" />
            <span className="size-2 rounded-full bg-border" />
            <span className="ml-2 text-xs text-muted-foreground">Student portal</span>
          </div>

          <div
            className="relative px-5 pt-5 pb-14 text-dashboard-band-foreground"
            style={{ backgroundImage: "linear-gradient(120deg, var(--dashboard-band-from), var(--dashboard-band-to))" }}
          >
            <p className="text-xs text-dashboard-band-foreground/70">Welcome back</p>
            <p className="mt-0.5 font-heading text-2xl">Your dashboard</p>
            <span className="absolute top-5 right-5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs">
              Your batch
            </span>
          </div>

          <div className="relative z-10 -mt-9 grid grid-cols-2 gap-3 px-4 pb-4">
            <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-card p-3.5">
              <ProgressRing pct={78} size={52} />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">O Level</p>
                <p className="truncate font-heading text-base leading-tight">Mathematics</p>
                <p className="text-xs text-muted-foreground">8 of 10 marked</p>
              </div>
            </div>
            <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-card p-3.5">
              <ProgressRing pct={64} size={52} />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">O Level</p>
                <p className="truncate font-heading text-base leading-tight">Physics</p>
                <p className="text-xs text-muted-foreground">5 of 6 marked</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-20 mt-4 w-full rounded-2xl border border-border bg-card p-3.5 shadow-[var(--shadow-elevated)] sm:absolute sm:top-[150px] sm:-left-5 sm:mt-0 sm:w-56 sm:-rotate-2">
          <p className="mb-2 text-sm font-semibold">Due this week</p>
          <div className="flex items-center justify-between gap-2 py-1.5 text-sm">
            <div>
              <p>Trigonometry worksheet</p>
              <p className="text-xs text-muted-foreground">Mathematics</p>
            </div>
            <Badge variant="warning">In 2 days</Badge>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border py-1.5 text-sm">
            <div>
              <p>Forces problems</p>
              <p className="text-xs text-muted-foreground">Physics</p>
            </div>
            <Badge variant="info">Submitted</Badge>
          </div>
        </div>

        <div className="relative z-20 mt-4 w-full rounded-2xl border border-border bg-card p-3.5 shadow-[var(--shadow-elevated)] sm:absolute sm:top-[96px] sm:-right-5 sm:mt-0 sm:w-48 sm:rotate-2">
          <p className="mb-2 flex items-center justify-between text-sm font-semibold">
            Marked <Badge variant="success">✓</Badge>
          </p>
          <p className="font-heading text-3xl leading-none tabular-nums">
            32<span className="text-lg text-muted-foreground"> / 40</span>
          </p>
          <p className="mt-2 text-xs text-muted-foreground italic">&ldquo;Clear working. Check units in Q4.&rdquo;</p>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">Illustration of the student portal</p>
    </div>
  );
}
