/**
 * Vimeo link helpers for recorded lectures. Pure (no fetch, no Supabase) so
 * they can be unit tested and used on both server and client.
 *
 * A lecture stores one `vimeo_id` string: the numeric video id, plus the
 * private hash of an unlisted link after a colon ("123456789:abcdef1234").
 * Must match the lectures_vimeo_id_format check in
 * supabase/migrations/20261011160000_stage24_lectures.sql.
 */

export type VimeoVideo = { id: string; hash: string | null };

const ID_PATTERN = /^[0-9]{1,20}$/;
const HASH_PATTERN = /^[A-Za-z0-9]{1,64}$/;
const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com"]);

/**
 * Reads a Vimeo video link. Accepts vimeo.com/ID, vimeo.com/ID/HASH and
 * player.vimeo.com/video/ID?h=HASH (with or without https://, with or
 * without www.). Anything else, including other sites, returns null.
 */
export function parseVimeoUrl(input: string): VimeoVideo | null {
  const trimmed = input.trim();
  if (trimmed.length === 0 || trimmed.length > 2000 || /\s/.test(trimmed)) return null;

  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password || url.port) return null;

  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split("/").filter(Boolean);

  if (VIMEO_HOSTS.has(host)) {
    if (segments.length < 1 || segments.length > 2) return null;
    const [id, hash] = segments;
    if (!ID_PATTERN.test(id)) return null;
    if (hash === undefined) return { id, hash: null };
    return HASH_PATTERN.test(hash) ? { id, hash } : null;
  }

  if (host === "player.vimeo.com") {
    if (segments.length !== 2 || segments[0] !== "video" || !ID_PATTERN.test(segments[1])) return null;
    const hash = url.searchParams.get("h");
    if (hash === null || hash === "") return { id: segments[1], hash: null };
    return HASH_PATTERN.test(hash) ? { id: segments[1], hash } : null;
  }

  return null;
}

/** The stored form: "ID" or "ID:HASH". */
export function toStoredVimeoId(video: VimeoVideo): string {
  return video.hash ? `${video.id}:${video.hash}` : video.id;
}

/** Reads a stored `vimeo_id` back; null if it isn't in the stored form. */
export function fromStoredVimeoId(stored: string): VimeoVideo | null {
  const [id, hash, extra] = stored.split(":");
  if (extra !== undefined || !ID_PATTERN.test(id ?? "")) return null;
  if (hash === undefined) return { id, hash: null };
  return HASH_PATTERN.test(hash) ? { id, hash } : null;
}

/** The video's page on vimeo.com, used for the admin form and for oEmbed. */
export function vimeoPageUrl(video: VimeoVideo): string {
  return video.hash ? `https://vimeo.com/${video.id}/${video.hash}` : `https://vimeo.com/${video.id}`;
}

/** The embeddable player address for the student's lecture page. */
export function vimeoEmbedUrl(video: VimeoVideo): string {
  const base = `https://player.vimeo.com/video/${video.id}`;
  return video.hash ? `${base}?h=${video.hash}` : base;
}

/** "4:05", "12:30" or "1:02:03"; null when the length isn't known. */
export function formatDuration(seconds: number | null): string | null {
  if (seconds === null || !Number.isFinite(seconds) || seconds <= 0) return null;
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const ss = String(secs).padStart(2, "0");
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${ss}` : `${minutes}:${ss}`;
}
