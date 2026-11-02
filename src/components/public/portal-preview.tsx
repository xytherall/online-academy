import { Badge } from "@/components/ui/badge";

/**
 * Static illustration of the student portal for the home hero. The numbers
 * below are sample content for the illustration only, never real student
 * data, hence the screen-reader caption. The rings fill and the side cards
 * float (Graph paper redesign); both stay still with reduced motion.
 *
 * Layout: a 940px-wide outer box holding a centred 720px window, leaving
 * margin on both sides for the floating cards, which stack as plain
 * full-width cards below 960px.
 */
export function PortalPreview() {
  return (
    <div className="relative mx-auto mt-[72px] max-w-[940px] px-4 text-left sm:px-6">
      <div className="relative min-[961px]:pb-14">
        <div className="relative z-10 mx-auto max-w-[720px] overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-elevated)]">
          <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
            <span className="size-2 rounded-full bg-border" />
            <span className="size-2 rounded-full bg-border" />
            <span className="size-2 rounded-full bg-border" />
            <span className="ml-2 text-xs text-muted-foreground">Student portal</span>
          </div>

          <div
            className="gp-grid-band relative px-5 pt-5 pb-14 text-dashboard-band-foreground"
            style={{ backgroundColor: "var(--dashboard-band-from)" }}
          >
            <p className="text-xs text-dashboard-band-foreground/70">Welcome back</p>
            <p className="mt-0.5 font-display text-2xl font-bold tracking-tight">Your dashboard</p>
            <span className="absolute top-5 right-5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs">
              Your batch
            </span>
          </div>

          <div className="relative z-10 -mt-9 grid grid-cols-1 gap-[14px] px-5 pb-5 sm:grid-cols-2">
            <PreviewCourse level="O Level" subject="Mathematics" marked="8 of 10 marked" pct={78} />
            <PreviewCourse level="O Level" subject="Physics" marked="5 of 6 marked" pct={64} />
          </div>
        </div>

        <div className="gp-bob relative z-20 mt-[14px] w-full rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-elevated)] min-[961px]:absolute min-[961px]:bottom-1 min-[961px]:left-[-8px] min-[961px]:mt-0 min-[961px]:w-[270px] min-[961px]:-rotate-2">
          <p className="mb-2.5 text-sm font-semibold">Due this week</p>
          <div className="flex items-center justify-between gap-2 py-2 text-sm">
            <div>
              <p>Trigonometry worksheet</p>
              <p className="text-xs text-muted-foreground">Mathematics</p>
            </div>
            <Badge variant="warning">In 2 days</Badge>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border py-2 text-sm">
            <div>
              <p>Forces problems</p>
              <p className="text-xs text-muted-foreground">Physics</p>
            </div>
            <Badge variant="info">Submitted</Badge>
          </div>
        </div>

        <div className="gp-bob-late relative z-20 mt-[14px] w-full rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-elevated)] min-[961px]:absolute min-[961px]:top-[64px] min-[961px]:right-[-8px] min-[961px]:mt-0 min-[961px]:w-[240px] min-[961px]:rotate-2">
          <p className="mb-2.5 flex items-center justify-between text-sm font-semibold">
            Marked <Badge variant="success">✓</Badge>
          </p>
          <p className="font-display text-3xl leading-none font-bold tabular-nums">
            32<span className="text-lg text-muted-foreground"> / 40</span>
          </p>
          <p className="mt-2 font-serif text-sm text-muted-foreground italic">
            &ldquo;Clear working. Check units in Q4.&rdquo;
          </p>
        </div>
      </div>

      <p className="sr-only">Illustration of the student portal</p>
    </div>
  );
}

function PreviewCourse({ level, subject, marked, pct }: { level: string; subject: string; marked: string; pct: number }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-card p-4">
      <PreviewRing pct={pct} />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{level}</p>
        <p className="truncate font-display text-lg leading-tight font-bold">{subject}</p>
        <p className="text-xs text-muted-foreground">{marked}</p>
      </div>
    </div>
  );
}

/** Illustration-only ring that fills on load; real progress uses ProgressRing. */
function PreviewRing({ pct }: { pct: number }) {
  const size = 58;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div aria-hidden className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} className="fill-none stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct / 100)}
          strokeLinecap="round"
          className="gp-ring fill-none stroke-primary"
          style={{ ["--ring-full" as string]: circumference }}
        />
      </svg>
      <span className="absolute text-sm font-semibold tabular-nums">{pct}%</span>
    </div>
  );
}
