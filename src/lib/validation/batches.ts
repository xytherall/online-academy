import { z } from "zod";

export const batchSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120, "Name must be 120 characters or fewer"),
  notes: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z.string().max(2000, "Notes must be 2,000 characters or fewer"),
  ).transform((value) => ((value as string).length > 0 ? (value as string) : null)),
});

export type BatchInput = z.infer<typeof batchSchema>;
