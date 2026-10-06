import { EmptyState } from "@/components/empty-state";
import { LocalDateTime } from "@/components/local-date-time";
import { QuizQuestionList } from "@/components/quiz-question-list";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import { quizResultSchema } from "@/lib/validation/quizzes";
import { QuizForm } from "./quiz-form";

/**
 * The quiz part of the student assessment page: the questions to answer, or
 * once submitted, the result with every wrong answer marked and the correct
 * one shown. Questions come from get_quiz_questions() (no correct answers);
 * the result from get_quiz_result(), which only answers after submitting.
 */
export async function QuizSection({
  assessmentId,
  studentId,
  dueAt,
  submission,
}: {
  assessmentId: string;
  studentId: string;
  dueAt: string;
  submission: Tables<"submissions"> | null;
}) {
  const supabase = await createClient();

  // Marks entered by the teacher without the student taking the quiz on the
  // page (e.g. done on paper): the page's normal Marks card shows them.
  if (submission && !submission.quiz_answers) return null;

  if (submission) {
    const { data, error } = await supabase.rpc("get_quiz_result", { p_assessment_id: assessmentId });
    const parsed = quizResultSchema.safeParse(data);
    if (error || !parsed.success) {
      return <LoadError>Could not load your result. Please refresh the page.</LoadError>;
    }
    const result = parsed.data;

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-semibold">
              You scored {result.marks ?? "–"} / {result.total}
            </p>
            {result.submitted_at ? (
              <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                Submitted <LocalDateTime iso={result.submitted_at} />
                {result.is_late ? <Badge variant="late">Late</Badge> : null}
              </p>
            ) : null}
            {submission.feedback ? (
              <p className="whitespace-pre-line text-sm text-muted-foreground">{submission.feedback}</p>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-2">
          <h2 className="font-medium">Answers</h2>
          <p className="text-sm text-muted-foreground">Correct answers are in green.</p>
          <QuizQuestionList
            questions={result.questions.map((q) => ({
              question: q.question,
              options: q.options,
              correctIndex: q.correct_index,
              chosenIndex: q.chosen,
            }))}
          />
        </div>
      </div>
    );
  }

  const { data: questions, error } = await supabase.rpc("get_quiz_questions", { p_assessment_id: assessmentId });
  if (error || !questions) {
    return <LoadError>Could not load the quiz. Please refresh the page.</LoadError>;
  }
  if (questions.length === 0) {
    return <EmptyState title="No questions yet" description="Your teacher hasn't added the questions yet." />;
  }

  const isLate = new Date(dueAt) < new Date();

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h2 className="font-medium">Questions</h2>
        <p className="text-sm text-muted-foreground">
          Choose one answer for each question. Each question is worth 1 mark. You can only submit once.
        </p>
      </div>
      {isLate ? (
        <Alert>
          <AlertDescription>The due date has passed. You can still submit, but it will be marked late.</AlertDescription>
        </Alert>
      ) : null}
      <QuizForm
        assessmentId={assessmentId}
        studentId={studentId}
        questions={questions.map((q) => ({ question: q.question, options: q.options }))}
      />
    </div>
  );
}

function LoadError({ children }: { children: React.ReactNode }) {
  return (
    <Alert variant="destructive">
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
