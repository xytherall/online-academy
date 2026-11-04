/**
 * Who an announcement or live class is for, e.g. "O Level Maths, A Level
 * Maths · Batch X", "Batch X", or "All students" when neither courses nor
 * batches are listed (no rows = all).
 */
export function postTargetLabel(courseNames: string[], batchNames: string[]): string {
  const parts = [courseNames, batchNames].filter((names) => names.length > 0).map((names) => names.join(", "));
  return parts.length > 0 ? parts.join(" · ") : "All students";
}

/** Names for the given ids, in the order of `items`; an unknown id gets `fallback`. */
export function namesForIds<T extends { id: string }>(
  ids: string[],
  items: T[],
  name: (item: T) => string,
  fallback: string,
): string[] {
  const known = items.filter((item) => ids.includes(item.id)).map(name);
  const unknownCount = ids.filter((id) => !items.some((item) => item.id === id)).length;
  return [...known, ...Array.from({ length: unknownCount }, () => fallback)];
}
