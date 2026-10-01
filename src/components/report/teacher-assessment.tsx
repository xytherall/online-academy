import type { TeacherAssessment } from "@/lib/progress-report";

const RATING_LABELS: Record<NonNullable<TeacherAssessment["effort_rating"]>, string> = {
  excellent: "Excellent",
  good: "Good",
  satisfactory: "Satisfactory",
  needs_improvement: "Needs improvement",
};

const RATING_STEPS: Record<NonNullable<TeacherAssessment["effort_rating"]>, number> = {
  excellent: 4,
  good: 3,
  satisfactory: 2,
  needs_improvement: 1,
};

export function hasAnyTeacherAssessment(assessment: TeacherAssessment): boolean {
  return Boolean(
    assessment.effort_rating ||
      assessment.participation_rating ||
      assessment.strengths ||
      assessment.areas_to_improve ||
      assessment.remarks,
  );
}

function RatingMeter({ label, rating }: { label: string; rating: TeacherAssessment["effort_rating"] }) {
  if (!rating) return null;
  const step = RATING_STEPS[rating];
  return (
    <div>
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            aria-hidden="true"
            className={`h-1.5 w-[22px] rounded-full ${i <= step ? "bg-primary" : "bg-border"}`}
          />
        ))}
        <span className="ml-2 text-sm font-semibold">{RATING_LABELS[rating]}</span>
      </div>
    </div>
  );
}

export function TeacherAssessmentCard({ assessment }: { assessment: TeacherAssessment }) {
  if (!hasAnyTeacherAssessment(assessment)) return null;

  return (
    <div className="space-y-4 rounded-2xl bg-muted p-5 print:border print:border-border">
      <h4 className="text-sm font-semibold">Teacher&apos;s assessment</h4>
      {assessment.effort_rating || assessment.participation_rating ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <RatingMeter label="Effort" rating={assessment.effort_rating} />
          <RatingMeter label="Class participation" rating={assessment.participation_rating} />
        </div>
      ) : null}
      {assessment.strengths || assessment.areas_to_improve ? (
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          {assessment.strengths ? (
            <div>
              <p className="mb-0.5 text-xs text-muted-foreground">Strengths</p>
              <p>{assessment.strengths}</p>
            </div>
          ) : null}
          {assessment.areas_to_improve ? (
            <div>
              <p className="mb-0.5 text-xs text-muted-foreground">Areas to improve</p>
              <p>{assessment.areas_to_improve}</p>
            </div>
          ) : null}
        </div>
      ) : null}
      {assessment.remarks ? (
        <p className="border-l-2 border-primary pl-3.5 font-heading text-[17px] italic leading-relaxed">
          &ldquo;{assessment.remarks}&rdquo;
        </p>
      ) : null}
    </div>
  );
}
