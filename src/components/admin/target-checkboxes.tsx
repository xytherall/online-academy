"use client";

type Option = { id: string; label: string };

/**
 * One "who is this for" group (courses or batches) on the announcement and
 * live class forms. "All" is ticked when nothing specific is, and ticking it
 * clears the others; ticking a specific one unticks "All". Only the specific
 * ids are submitted (as `name`), so "All" posts an empty list.
 */
export function TargetCheckboxes({
  legend,
  name,
  allLabel,
  emptyNote,
  options,
  selected,
  onChange,
  error,
}: {
  legend: string;
  name: string;
  allLabel: string;
  emptyNote: string;
  options: Option[];
  selected: string[];
  onChange: (next: string[]) => void;
  error?: string;
}) {
  function toggle(id: string, checked: boolean) {
    onChange(checked ? [...selected, id] : selected.filter((value) => value !== id));
  }

  return (
    <fieldset className="space-y-2" aria-invalid={Boolean(error)}>
      <legend className="mb-2 text-sm leading-none font-medium">{legend}</legend>
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyNote}</p>
      ) : (
        <div className="space-y-1">
          <label className="flex items-center gap-2 py-1 text-sm">
            <input
              type="checkbox"
              checked={selected.length === 0}
              onChange={(event) => {
                if (event.target.checked) onChange([]);
              }}
            />
            {allLabel}
          </label>
          {options.map((option) => (
            <label key={option.id} className="flex items-center gap-2 py-1 text-sm">
              <input
                type="checkbox"
                name={name}
                value={option.id}
                checked={selected.includes(option.id)}
                onChange={(event) => toggle(option.id, event.target.checked)}
              />
              {option.label}
            </label>
          ))}
        </div>
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </fieldset>
  );
}
