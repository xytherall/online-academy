import { z } from "zod";

/**
 * Course or batch ids an announcement or live class is for, read with
 * formData.getAll(). An empty list means all courses / all batches.
 * Duplicates are dropped.
 */
export function targetIdsSchema(message: string) {
  return z
    .array(z.uuid({ error: message }), { error: message })
    .max(200, message)
    .transform((ids) => [...new Set(ids)]);
}
