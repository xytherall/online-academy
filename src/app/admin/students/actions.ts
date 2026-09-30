"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createStudentAccount } from "@/lib/create-student-account";
import { getStudentProfile } from "@/lib/students";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  adminResetPasswordSchema,
  studentProfileUpdateSchema,
  studentSchema,
  teacherAssessmentSchema,
  type TeacherAssessmentInput,
} from "@/lib/validation/students";

export type StudentFormState = { error: string | null };
type ActionResult = { error: string | null };

const NOT_A_STUDENT_ERROR = "That account is not a student.";
const DUPLICATE_ENROLLMENT_ERROR = "This student is already enrolled in that course.";

function profileFieldsFromForm(formData: FormData) {
  return {
    full_name: formData.get("full_name"),
    phone: formData.get("phone"),
    whatsapp: formData.get("whatsapp"),
    country: formData.get("country"),
    school: formData.get("school"),
    guardian_name: formData.get("guardian_name"),
    guardian_phone: formData.get("guardian_phone"),
    guardian_email: formData.get("guardian_email"),
  };
}

export async function createStudent(
  _prevState: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  await requireAdmin();

  const parsed = studentSchema.safeParse({
    ...profileFieldsFromForm(formData),
    email: formData.get("email"),
    course_ids: formData.getAll("course_ids"),
    batch_id: formData.get("batch_id"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const result = await createStudentAccount(supabase, data);
  if (!result.ok) return { error: result.error };

  revalidatePath("/admin/students");
  redirect(`/admin/students/${result.studentId}`);
}

export async function updateStudentProfile(
  studentId: string,
  _prevState: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  await requireAdmin();

  const supabase = await createClient();
  const student = await getStudentProfile(supabase, studentId);
  if (!student) return { error: NOT_A_STUDENT_ERROR };

  const parsed = studentProfileUpdateSchema.safeParse(profileFieldsFromForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", studentId);
  if (error) return { error: "Could not save the student's details. Please try again." };

  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath("/admin/students");
  return { error: null };
}

export async function reassignStudentBatch(studentId: string, batchId: string | null): Promise<ActionResult> {
  await requireAdmin();

  const supabase = await createClient();
  const student = await getStudentProfile(supabase, studentId);
  if (!student) return { error: NOT_A_STUDENT_ERROR };

  const { error } = await supabase.from("profiles").update({ batch_id: batchId }).eq("id", studentId);
  if (error) return { error: "Could not update the student's batch. Please try again." };

  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath("/admin/students");
  revalidatePath("/admin/batches");
  return { error: null };
}

export async function setStudentActive(studentId: string, isActive: boolean): Promise<ActionResult> {
  await requireAdmin();

  const supabase = await createClient();
  const student = await getStudentProfile(supabase, studentId);
  if (!student) return { error: NOT_A_STUDENT_ERROR };

  const { error } = await supabase.from("profiles").update({ is_active: isActive }).eq("id", studentId);
  if (error) return { error: "Could not update the student's status. Please try again." };

  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath("/admin/students");
  revalidatePath("/admin");
  return { error: null };
}

export async function resetStudentPassword(studentId: string, password: string): Promise<ActionResult> {
  await requireAdmin();

  const supabase = await createClient();
  const student = await getStudentProfile(supabase, studentId);
  if (!student) return { error: NOT_A_STUDENT_ERROR };

  const parsed = adminResetPasswordSchema.safeParse({ password });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the password and try again." };
  }

  const adminClient = createAdminClient();
  const { error: authError } = await adminClient.auth.admin.updateUserById(studentId, {
    password: parsed.data.password,
  });
  if (authError) return { error: "Could not reset the password. Please try again." };

  const { error } = await supabase
    .from("profiles")
    .update({ must_change_password: true })
    .eq("id", studentId);
  if (error) return { error: "Could not reset the password. Please try again." };

  revalidatePath(`/admin/students/${studentId}`);
  return { error: null };
}

export async function addEnrollment(studentId: string, courseId: string): Promise<ActionResult> {
  await requireAdmin();

  const supabase = await createClient();
  const student = await getStudentProfile(supabase, studentId);
  if (!student) return { error: NOT_A_STUDENT_ERROR };

  const { error } = await supabase
    .from("enrollments")
    .insert({ student_id: studentId, course_id: courseId });

  if (error) {
    if (error.code === "23505") return { error: DUPLICATE_ENROLLMENT_ERROR };
    return { error: "Could not add the enrollment. Please try again." };
  }

  revalidatePath(`/admin/students/${studentId}`);
  return { error: null };
}

export async function removeEnrollment(studentId: string, enrollmentId: string): Promise<ActionResult> {
  await requireAdmin();

  const supabase = await createClient();
  const student = await getStudentProfile(supabase, studentId);
  if (!student) return { error: NOT_A_STUDENT_ERROR };

  const { error } = await supabase
    .from("enrollments")
    .delete()
    .eq("id", enrollmentId)
    .eq("student_id", studentId);
  if (error) return { error: "Could not remove the enrollment. Please try again." };

  revalidatePath(`/admin/students/${studentId}`);
  return { error: null };
}

export async function updateTeacherAssessment(
  studentId: string,
  enrollmentId: string,
  input: TeacherAssessmentInput,
): Promise<ActionResult> {
  await requireAdmin();

  const supabase = await createClient();
  const student = await getStudentProfile(supabase, studentId);
  if (!student) return { error: NOT_A_STUDENT_ERROR };

  const parsed = teacherAssessmentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the fields and try again." };
  }

  const { error } = await supabase
    .from("enrollments")
    .update(parsed.data)
    .eq("id", enrollmentId)
    .eq("student_id", studentId);
  if (error) return { error: "Could not save the teacher assessment. Please try again." };

  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath(`/admin/students/${studentId}/report`);
  return { error: null };
}
