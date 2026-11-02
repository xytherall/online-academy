import { Badge } from "@/components/ui/badge";

/**
 * "What you get" bento (Graph paper redesign). Headings, body copy and the
 * mini UI fragments below are owner-approved descriptive copy and sample
 * illustration, not student data (SPEC §15). The progress chart's bars grow
 * when the section scrolls into view (see `.gp-bar` in globals.css).
 */
const REPORT_BARS = [
  [58, 50],
  [66, 55],
  [72, 63],
  [82, 70],
];

export function BentoGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Tile className="md:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <TileTitle>A progress report parents can read</TileTitle>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Marks, missing work and teacher comments for every subject.
            </p>
          </div>
          <div className="flex items-center gap-3.5 text-[13px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] bg-primary" />
              Mathematics
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] bg-[var(--tile-teal)]" />
              Physics
            </span>
          </div>
        </div>
        <div
          aria-hidden
          className="gp-grid mt-3.5 flex h-[190px] items-end gap-[6%] rounded-2xl border border-border bg-background px-[6%]"
        >
          {REPORT_BARS.map(([maths, physics], index) => (
            <div key={index} className="flex h-full flex-1 items-end gap-1.5">
              <div
                className="gp-bar flex-1 rounded-t-lg bg-primary"
                style={{ height: `${maths}%`, animationDelay: `${index * 0.15}s` }}
              />
              <div
                className="gp-bar flex-1 rounded-t-lg bg-[var(--tile-teal)]"
                style={{ height: `${physics}%`, animationDelay: `${index * 0.15 + 0.05}s` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2.5 grid grid-cols-1 gap-2.5 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-2 rounded-xl bg-background-alt px-3.5 py-2.5">
            <span>Mathematics</span>
            <span className="text-muted-foreground">Effort: Excellent</span>
          </div>
          <div className="flex justify-between gap-2 rounded-xl bg-background-alt px-3.5 py-2.5">
            <span>Physics</span>
            <span className="text-muted-foreground">Effort: Good</span>
          </div>
        </div>
      </Tile>

      <Tile>
        <TileTitle>Live online classes</TileTitle>
        <p className="text-sm text-muted-foreground">Taught live on Zoom or Google Meet, in small batches.</p>
        <div aria-hidden className="mt-auto grid grid-cols-3 gap-2 pt-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className={
                index === 0
                  ? "grid aspect-4/3 place-items-center rounded-xl bg-primary-soft outline-2 -outline-offset-2 outline-primary"
                  : "grid aspect-4/3 place-items-center rounded-xl bg-primary-soft"
              }
            >
              <span className={index === 0 ? "size-5 rounded-full bg-primary/45" : "size-5 rounded-full bg-primary/30"} />
            </div>
          ))}
        </div>
      </Tile>

      <Tile>
        <TileTitle>Notes and past papers</TileTitle>
        <p className="text-sm text-muted-foreground">Every PDF and link your teacher shares, in order.</p>
        <div className="mt-auto grid gap-2 pt-4">
          <FileRow kind="PDF" label="Chapter 4 notes: Quadratics" />
          <FileRow kind="PDF" label="Past paper practice set" />
          <FileRow kind="URL" label="Class recording" />
        </div>
      </Tile>

      <Tile>
        <TileTitle>Assignments with feedback</TileTitle>
        <p className="text-sm text-muted-foreground">Upload a PDF or a photo of your work. Get marks and comments back.</p>
        <div className="mt-auto space-y-2.5 pt-4">
          <div className="rounded-xl border-[1.5px] border-dashed border-border bg-background px-3.5 py-3 text-center text-xs text-muted-foreground">
            Drop your work here
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Algebra homework</span>
            <Badge variant="success">18 / 20</Badge>
          </div>
        </div>
      </Tile>

      <Tile>
        <TileTitle>Announcements for your batch</TileTitle>
        <p className="text-sm text-muted-foreground">Updates for everyone, your subject or just your group.</p>
        <div className="mt-auto space-y-2.5 pt-4">
          <MessageRow label="Class moved to Saturday" tag="Your batch" />
          <MessageRow label="New practice set uploaded" tag="Mathematics" />
        </div>
      </Tile>
    </div>
  );
}

function Tile({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`hover-lift flex min-w-0 flex-col gap-2 overflow-hidden rounded-3xl border border-border bg-card p-6 ${className}`}>
      {children}
    </div>
  );
}

function TileTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="font-display text-2xl font-bold tracking-[-0.02em]">{children}</h3>;
}

function FileRow({ kind, label }: { kind: "PDF" | "URL"; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm">
      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary-soft text-[10px] font-bold text-primary">
        {kind}
      </span>
      <span className="truncate">{label}</span>
    </div>
  );
}

function MessageRow({ label, tag }: { label: string; tag: string }) {
  return (
    <div className="border-l-2 border-primary py-0.5 pl-3 text-sm">
      <p>{label}</p>
      <p className="text-xs text-muted-foreground">{tag}</p>
    </div>
  );
}
