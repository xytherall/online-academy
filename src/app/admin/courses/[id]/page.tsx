import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { SectionTabs } from "@/components/portal/section-tabs";
import { createClient } from "@/lib/supabase/server";
import { CourseForm } from "../course-form";
import type { QuizEditInfo } from "./assessment-form";
import { AssessmentManager } from "./assessment-manager";
import { LectureManager } from "./lecture-manager";
import { ResourceManager } from "./resource-manager";

export const metadata: Metadata = { title: "Edit course" };

const TABS = ["assessments", "resources", "lectures", "details"] as const;
type Tab = (typeof TABS)[number];

export default async function EditCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, { tab: tabParam }] = await Promise.all([params, searchParams]);
  const tab: Tab = TABS.find((t) => t === tabParam) ?? "assessments";
  const supabase = await createClient();

  const [
    { data: course, error: courseError },
    { data: resources, error: resourcesError },
    { data: lectures, error: lecturesError },
    { data: assessments, error: assessmentsError },
    { data: batches, error: batchesError },
    { data: enrolledStudents, error: enrolledError },
  ] = await Promise.all([
    supabase.from("courses").select("*").eq("id", id).maybeSingle(),
    supabase.from("resources").select("*").eq("course_id", id).order("sort_order", { ascending: true }),
    supabase
      .from("lectures")
      .select("*")
      .eq("course_id", id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
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
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="space-y-1">
        <Link
          href="/admin/courses"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon aria-hidden className="size-4" />
          All courses
        </Link>
        <h1 className="font-heading text-2xl font-bold tracking-[-0.02em] sm:text-3xl">{course.title}</h1>
      </div>

      <SectionTabs
        basePath={`/admin/courses/${course.id}`}
        active={tab}
        tabs={[
          { id: "assessments", label: "Assignments and tests", count: assessments?.length ?? 0 },
          { id: "resources", label: "Notes and files", count: resources?.length ?? 0 },
          { id: "lectures", label: "Recorded lectures", count: lectures?.length ?? 0 },
          { id: "details", label: "Course details" },
        ]}
      />

      <div className="rounded-3xl border border-border bg-card p-5 sm:p-7">
        {tab === "details" ? <CourseForm mode="edit" course={course} /> : null}

        {tab === "resources" ? (
          resourcesError ? (
            <p className="text-sm text-destructive">Could not load resources. Please refresh the page.</p>
          ) : (
            <ResourceManager courseId={course.id} resources={resources ?? []} />
          )
        ) : null}

        {tab === "lectures" ? (
          lecturesError ? (
            <p className="text-sm text-destructive">Could not load recorded lectures. Please refresh the page.</p>
          ) : (
            <LectureManager courseId={course.id} lectures={lectures ?? []} />
          )
        ) : null}

        {tab === "assessments" ? (
          assessmentsError || batchesError || enrolledError || quizQuestionsError || quizSubmissionsError ? (
            <p className="text-sm text-destructive">Could not load assessments. Please refresh the page.</p>
          ) : (
            <AssessmentManager
              courseId={course.id}
              assessments={assessments ?? []}
              quizzes={quizzes}
              batches={batches ?? []}
              courseBatchIds={courseBatchIds}
            />
          )
        ) : null}
      </div>
    </div>
  );
}