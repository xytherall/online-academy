import { z } from "zod";
import { MIN_PASSWORD_LENGTH } from "./auth";
import { optionalTrimmed, profileFields } from "./students";

/**
 * SPEC §6 form fields. `profileFields` is reused from ./students so the
 * application and the student account it becomes validate identically — an
 * accepted application's details are copied straight into `profiles`.
 */
export const applicationSchema = z.object({
  ...profileFields,
  email: z
    .string()
    .trim()
    .max(255, "Email must be 255 characters or fewer")
    .pipe(z.email("Enter a valid email address")),
  level: z.enum(["O", "A"], { error: "Choose O Level or A Level" }),
  course_ids: z.array(z.uuid()).min(1, "Choose at least one course"),
  heard_about: optionalTrimmed(500, "This must be 500 characters or fewer"),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;

/**
 * Accepting an application (SPEC §6): the admin confirms the courses, may pick
 * a batch, and sets the temporary password. Everything else comes from the
 * stored application, not from the browser.
 */
export const acceptApplicationSchema = z.object({
  course_ids: z.array(z.uuid()).min(1, "Choose at least one course"),
  batch_id: z.preprocess((value) => (value === "" ? null : value), z.uuid().nullable()),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`),
});

export type AcceptApplicationInput = z.infer<typeof acceptApplicationSchema>;
