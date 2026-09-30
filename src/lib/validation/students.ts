import { z } from "zod";
import { MIN_PASSWORD_LENGTH } from "./auth";

function optionalTrimmed(maxLength: number, message: string) {
  return z
    .preprocess(
      (value) => (typeof value === "string" ? value.trim() : ""),
      z.string().max(maxLength, message),
    )
    .transform((value) => ((value as string).length > 0 ? (value as string) : null));
}

function optionalTrimmedEmail() {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim().length > 0 ? value.trim() : null),
    z
      .string()
      .nullable()
      .refine((value) => value === null || z.email().safeParse(value).success, {
        message: "Enter a valid email address",
      }),
  );
}

const profileFields = {
  full_name: z.string().trim().min(1, "Full name is required").max(200, "Full name must be 200 characters or fewer"),
  phone: z.string().trim().min(1, "Phone number is required").max(40, "Phone number must be 40 characters or fewer"),
  whatsapp: optionalTrimmed(40, "WhatsApp number must be 40 characters or fewer"),
  country: z.string().trim().min(1, "Country is required").max(100, "Country must be 100 characters or fewer"),
  school: optionalTrimmed(200, "Current school must be 200 characters or fewer"),
  guardian_name: optionalTrimmed(200, "Guardian name must be 200 characters or fewer"),
  guardian_phone: optionalTrimmed(40, "Guardian phone must be 40 characters or fewer"),
  guardian_email: optionalTrimmedEmail(),
};

export const studentSchema = z.object({
  ...profileFields,
  email: z.string().trim().pipe(z.email("Enter a valid email address")),
  course_ids: z.array(z.uuid()).min(1, "Choose at least one course"),
  batch_id: z.preprocess((value) => (value === "" ? null : value), z.uuid().nullable()),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`),
});

export type StudentInput = z.infer<typeof studentSchema>;

// Email, password, courses and batch are handled by their own dedicated
// actions/UI, not the profile-details edit form.
export const studentProfileUpdateSchema = z.object(profileFields);

export type StudentProfileUpdateInput = z.infer<typeof studentProfileUpdateSchema>;

export const adminResetPasswordSchema = z.object({
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`),
});

export type AdminResetPasswordInput = z.infer<typeof adminResetPasswordSchema>;

const ratingLevels = ["excellent", "good", "satisfactory", "needs_improvement"] as const;

function optionalRating() {
  return z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    z.enum(ratingLevels).nullable(),
  );
}

// SPEC §9 progress-report "Teacher assessment" block. Same length limit as
// `remarks` — these are the same kind of short free-text admin note.
export const teacherAssessmentSchema = z.object({
  effort_rating: optionalRating(),
  participation_rating: optionalRating(),
  strengths: optionalTrimmed(2000, "Strengths must be 2,000 characters or fewer"),
  areas_to_improve: optionalTrimmed(2000, "Areas to improve must be 2,000 characters or fewer"),
  remarks: optionalTrimmed(2000, "Other comments must be 2,000 characters or fewer"),
});

export type TeacherAssessmentInput = z.infer<typeof teacherAssessmentSchema>;
