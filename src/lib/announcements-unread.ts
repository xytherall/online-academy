/**
 * Pure unread-announcement math, kept free of Supabase so it can be unit
 * tested without a database. Visibility itself is never decided here — it
 * is entirely RLS's job ("Students can read their announcements"); these
 * helpers only compare timestamps against a per-student watermark.
 */

export function resolveSeenCutoff(
  seenRow: { last_seen_at: string } | null,
  profileCreatedAt: string,
): string {
  return seenRow?.last_seen_at ?? profileCreatedAt;
}

export function isNew(createdAt: string, cutoff: string): boolean {
  return new Date(createdAt).getTime() > new Date(cutoff).getTime();
}

export function countUnread(announcements: { created_at: string }[], cutoff: string): number {
  return announcements.filter((a) => isNew(a.created_at, cutoff)).length;
}

export function formatUnreadBadge(count: number): string {
  return count > 9 ? "9+" : String(count);
}
