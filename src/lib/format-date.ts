// Server Components render in a UTC process, so these must only be called
// client-side (from "use client" components) — never in a Server Component,
// or the formatted string would be wrong for the viewer.

// A <input type="datetime-local"> reports "" while incomplete, but browsers
// can still hand back an out-of-range intermediate value while the user is
// mid-edit — returning "" instead of throwing keeps the hidden field (and
// the form) from crashing on a value that isn't a real date yet.
export function toUtcIso(datetimeLocalValue: string): string {
  const date = new Date(datetimeLocalValue);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

// Inverse of toUtcIso: converts a stored UTC ISO string back into the local
// wall-clock string a <input type="datetime-local"> expects (YYYY-MM-DDTHH:mm).
export function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function formatLocalDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Short "2 Sep" form used for chart axis labels and tooltips. */
export function formatShortLocalDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
