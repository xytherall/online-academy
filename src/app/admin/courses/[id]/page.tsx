import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/server";
import { CourseForm } from "../course-form";
import type { QuizEditInfo } from "./assessment-form";
import { AssessmentManager } from "./assessment-manager";
import { ResourceManager } from "./resource-manager";

export const metadata: Metadata = { title: "Edit course" };

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: course, error: courseError },
    { data: resources, error: resourcesError },
    { data: assessments, error: assessmentsError },
    { data: batches, error: batchesError },
    { data: enrolledStudents, error: enrolledError },
  ] = await Promise.all([
    supabase.from("courses").select("*").eq("id", id).maybeSingle(),
    supabase.from("resources").select("*").eq("course_id", id).order("sort_order", { ascending: true }),
    supabase.from("assessments").select("*").eq("course_id", id).order("due_at", { ascending: true }),
    supabase.from("batches").select("id, name").order("name", { ascending: true }),
    supabase.from("enrollments").select("student:profiles(batch_id)").eq("course_id", id),
  ]);

  // Batches aren't tied to a course (SPEC §2), so the target-batch choice is
  // narrowed to batches with at least one student enrolled in this course.
  // Targeting any other batch would reach nobody.
  const courseBatchIds = [
    ...new Set((enrolledStudents ?? []).flatMap((row) => (row.student?.batch_id ? [row.student.batch_id] : []))),
  ];

  // Quizzes: their saved questions (for editing) and whether anyone has
  // submitted yet, which locks the questions.
  const quizIds = (assessments ?? []).filter((a) => a.type === "quiz").map((a) => a.id);
  const [{ data: quizQuestions, error: quizQuestionsError }, { data: quizSubmissions, error: quizSubmissionsError }] =
    quizIds.length > 0
      ? await Promise.all([
          supabase
            .from("quiz_questions")
            .select("assessment_id, question, options, correct_index")
            .in("assessment_id", quizIds)
            .order("position", { ascending: true }),
          supabase.from("submissions").select("assessment_id").in("assessment_id", quizIds),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
        ];

  const quizzes: Record<string, QuizEditInfo> = {};
  const submittedQuizIds = new Set((quizSubmissions ?? []).map((s) => s.assessment_id));
  for (const id of quizIds) quizzes[id] = { questions: [], locked: submittedQuizIds.has(id) };
  for (const q of quizQuestions ?? []) {
    quizzes[q.assessment_id]?.questions.push({
      question: q.question,
      options: q.options,
      correctIndex: q.correct_index,
    });
  }

  if (courseError) {
    return <p className="text-sm text-destructive">Could not load this course. Please refresh the page.</p>;
  }
  if (!course) notFound();

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">{course.title}</h1>

      <CourseForm mode="edit" course={course} />

      <Separator />

      {resourcesError ? (
        <p className="text-sm text-destructive">Could not load resources. Please refresh the page.</p>
      ) : (
        <ResourceManager courseId={course.id} resources={resources ?? []} />
      )}

      <Separator />

      {assessmentsError || batchesError || enrolledError || quizQuestionsError || quizSubmissionsError ? (
        <p className="text-sm text-destructive">Could not load assessments. Please refresh the page.</p>
      ) : (
        <AssessmentManager
          courseId={course.id}
          assessments={assessments ?? []}
          quizzes={quizzes}
          batches={batches ?? []}
          courseBatchIds={courseBatchIds}
        />
      )}
    </div>
  );
}
