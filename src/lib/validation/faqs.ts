import { z } from "zod";

export const faqSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, "Question is required")
    .max(200, "Question must be 200 characters or fewer"),
  answer: z
    .string()
    .trim()
    .min(1, "Answer is required")
    .max(2000, "Answer must be 2,000 characters or fewer"),
});

export type FaqInput = z.infer<typeof faqSchema>;
