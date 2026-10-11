import "server-only";
import { z } from "zod";
import { vimeoPageUrl, type VimeoVideo } from "@/lib/vimeo";

export type VimeoDetails = { duration_seconds: number | null; thumbnail_url: string | null };

const NO_DETAILS: VimeoDetails = { duration_seconds: null, thumbnail_url: null };

const oembedSchema = z.object({
  duration: z.number().int().positive().optional().catch(undefined),
  thumbnail_url: z
    .string()
    .max(2000)
    .refine((value) => value.startsWith("https://") && !/\s/.test(value))
    .optional()
    .catch(undefined),
});

/**
 * Length and thumbnail from Vimeo's public oEmbed endpoint. Saving a lecture
 * must never depend on this: a private or domain-restricted video, a Vimeo
 * outage or a slow answer just means both stay empty.
 */
export async function fetchVimeoDetails(video: VimeoVideo): Promise<VimeoDetails> {
  const endpoint = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(vimeoPageUrl(video))}`;
  try {
    const response = await fetch(endpoint, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!response.ok) return NO_DETAILS;
    const parsed = oembedSchema.safeParse(await response.json());
    if (!parsed.success) return NO_DETAILS;
    return {
      duration_seconds: parsed.data.duration ?? null,
      thumbnail_url: parsed.data.thumbnail_url ?? null,
    };
  } catch (error) {
    console.warn("Vimeo oEmbed lookup failed:", error instanceof Error ? error.message : error);
    return NO_DETAILS;
  }
}
