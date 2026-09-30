import { cn } from "@/lib/utils";
import { COUNTRIES, isKnownCountry } from "@/lib/countries";

/**
 * Country picker for the application form and the admin student forms.
 *
 * Deliberately a native <select> rather than the base-ui `Select` used
 * elsewhere in this project: that one has no search box, and scrolling ~195
 * options in a custom popup is painful — worst of all on a phone, which is how
 * most applicants will use this (SPEC §12). A native select opens the OS picker
 * on mobile and supports type-to-jump on desktop for free. Styled to match
 * `Input` so it does not look out of place next to the other fields.
 *
 * `legacyValue` covers a student whose country was typed freehand before
 * src/lib/countries.ts existed: it is added as an extra option and pre-selected,
 * so opening and saving the edit form never silently blanks or rewrites it.
 */
export function CountrySelect({
  id,
  name = "country",
  defaultValue,
  invalid,
  className,
}: {
  id?: string;
  name?: string;
  defaultValue?: string | null;
  invalid?: boolean;
  className?: string;
}) {
  const current = defaultValue?.trim() ?? "";
  const legacyValue = current.length > 0 && !isKnownCountry(current) ? current : null;

  return (
    <select
      id={id}
      name={name}
      defaultValue={current}
      aria-invalid={invalid || undefined}
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className,
      )}
    >
      <option value="">Select a country</option>
      {legacyValue ? <option value={legacyValue}>{legacyValue}</option> : null}
      {COUNTRIES.map((country) => (
        <option key={country} value={country}>
          {country}
        </option>
      ))}
    </select>
  );
}
