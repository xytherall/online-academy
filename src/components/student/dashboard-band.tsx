/**
 * Student dashboard header band (SPEC §12): a navy gradient with a faint
 * graph-paper grid, "Welcome back", the student's name and a batch chip.
 */
export function DashboardBand({ name, batchName }: { name: string; batchName: string | null }) {
  return (
    <div
      className="relative overflow-hidden rounded-3xl px-6 py-8 text-dashboard-band-foreground sm:px-8 sm:py-10"
      style={{ backgroundImage: "linear-gradient(135deg, var(--dashboard-band-from), var(--dashboard-band-to))" }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
        style={{
          backgroundImage:
            "linear-gradient(var(--grid-line-band) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line-band) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="relative space-y-1">
        <p className="text-sm text-dashboard-band-foreground/70">Welcome back</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-2xl">{name}</h1>
          {batchName ? (
            <span className="rounded-full bg-dashboard-band-foreground/15 px-3 py-1 text-xs font-medium">
              {batchName}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
