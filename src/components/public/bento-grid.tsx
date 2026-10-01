import { Badge } from "@/components/ui/badge";

/**
 * "What you get" bento (home page redesign spec, point 3). Headings, body
 * copy and the mini UI fragments below are owner-approved descriptive copy,
 * not student data — see SPEC §15.
 */
export function BentoGrid() {
  return (
    <div className="grid grid-cols-6 gap-4">
      <Tile span="s4">
        <h3 className="font-heading text-xl sm:text-2xl">Notes and past papers, organised by course</h3>
        <p className="text-sm text-muted-foreground">
          Every PDF and link your teacher shares, in order, available any time.
        </p>
        <div className="mt-auto grid gap-2 pt-4">
          <FileRow kind="PDF" label="Chapter 4 notes: Quadratics" tag="Mathematics" />
          <FileRow kind="PDF" label="Past paper practice set" tag="Mathematics" />
          <FileRow kind="URL" label="Class recording" tag="Physics" />
        </div>
      </Tile>

      <Tile span="s2">
        <h3 className="font-heading text-xl sm:text-2xl">Live online classes</h3>
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
              <span className="size-5 rounded-full bg-primary/35" />
            </div>
          ))}
        </div>
      </Tile>

      <Tile span="s2">
        <h3 className="font-heading text-xl sm:text-2xl">Assignments with feedback</h3>
        <p className="text-sm text-muted-foreground">Upload a PDF or a photo of your work. Get marks and comments back.</p>
        <div className="mt-auto space-y-2.5 pt-4">
          <div className="rounded-xl border border-dashed border-border bg-background px-3.5 py-3 text-center text-xs text-muted-foreground">
            Drop your work here
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Algebra homework</span>
            <Badge variant="success">18 / 20</Badge>
          </div>
        </div>
      </Tile>

      <Tile span="s2">
        <h3 className="font-heading text-xl sm:text-2xl">A progress report parents can read</h3>
        <p className="text-sm text-muted-foreground">Marks, missing work and teacher comments for every subject.</p>
        <div className="mt-auto space-y-2 pt-4">
          <div className="flex items-center justify-between border-b border-border pb-2 text-sm">
            <span>Mathematics</span>
            <span className="text-xs text-muted-foreground">Effort: Excellent</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Physics</span>
            <span className="text-xs text-muted-foreground">Effort: Good</span>
          </div>
        </div>
      </Tile>

      <Tile span="s2">
        <h3 className="font-heading text-xl sm:text-2xl">Announcements for your batch</h3>
        <p className="text-sm text-muted-foreground">Updates for everyone, your subject or just your group.</p>
        <div className="mt-auto space-y-2.5 pt-4">
          <MessageRow label="Class moved to Saturday" tag="Your batch" />
          <MessageRow label="New practice set uploaded" tag="Mathematics" />
        </div>
      </Tile>
    </div>
  );
}

function Tile({ span, children }: { span: "s4" | "s2"; children: React.ReactNode }) {
  return (
    <div
      className={
        (span === "s4" ? "col-span-6 md:col-span-4" : "col-span-6 sm:col-span-3 md:col-span-2") +
        " flex min-w-0 flex-col gap-2 overflow-hidden rounded-3xl border border-border bg-card p-6"
      }
    >
      {children}
    </div>
  );
}

function FileRow({ kind, label, tag }: { kind: "PDF" | "URL"; label: string; tag: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm">
      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary-soft text-[11px] font-bold text-primary">
        {kind}
      </span>
      <span className="truncate">{label}</span>
      <span className="ml-auto shrink-0 text-xs text-muted-foreground">{tag}</span>
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
