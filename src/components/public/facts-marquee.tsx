/**
 * Scrolling strip of facts under the home hero (Graph paper redesign). The
 * facts are the academy's own descriptive copy (the same claims as the About
 * page and "What you get"), not statistics. The list is rendered twice so the
 * loop is seamless; the copy is hidden from screen readers and stays still
 * with reduced motion.
 */
const FACTS = [
  "Cambridge curriculum",
  "Live on Zoom or Google Meet",
  "Small batches",
  "Assignments and tests, marked",
  "Progress report for parents",
  "Everything in one student portal",
];
const SYMBOLS = ["∑", "λ", "∫", "π", "Δ", "∑"];

export function FactsMarquee() {
  return (
    <div className="overflow-hidden border-y border-border bg-background py-[18px]">
      <ul className="sr-only">
        {FACTS.map((fact) => (
          <li key={fact}>{fact}</li>
        ))}
      </ul>
      <div aria-hidden className="gp-marquee flex w-max gap-9 text-base font-semibold whitespace-nowrap">
        {[0, 1].map((copy) =>
          FACTS.map((fact, index) => (
            <span key={`${copy}-${fact}`} className="flex items-center gap-9">
              {fact}
              <span className="font-serif text-primary italic">{SYMBOLS[index]}</span>
            </span>
          )),
        )}
      </div>
    </div>
  );
}
