"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/admin/empty-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { TeacherAssessmentInput } from "@/lib/validation/students";
import { addEnrollment, removeEnrollment, updateTeacherAssessment } from "../actions";

type Course = { id: string; title: string; level: "O" | "A" };
type Rating = TeacherAssessmentInput["effort_rating"];
type Enrollment = {
  id: string;
  remarks: string | null;
  effort_rating: Rating;
  participation_rating: Rating;
  strengths: string | null;
  areas_to_improve: string | null;
  course: Course;
};

const RATING_LABELS: Record<NonNullable<Rating>, string> = {
  excellent: "Excellent",
  good: "Good",
  satisfactory: "Satisfactory",
  needs_improvement: "Needs improvement",
};

function hasAnyTeacherAssessment(enrollment: Enrollment) {
  return Boolean(
    enrollment.effort_rating ||
      enrollment.participation_rating ||
      enrollment.strengths ||
      enrollment.areas_to_improve ||
      enrollment.remarks,
  );
}

export function StudentEnrollmentsManager({
  studentId,
  enrollments,
  availableCourses,
}: {
  studentId: string;
  enrollments: Enrollment[];
  availableCourses: Course[];
}) {
  const router = useRouter();
  const [addError, setAddError] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [isAddPending, startAddTransition] = useTransition();

  function handleAdd() {
    if (!selectedCourseId) return;
    setAddError(null);
    startAddTransition(async () => {
      const result = await addEnrollment(studentId, selectedCourseId);
      if (result.error) {
        setAddError(result.error);
        return;
      }
      setSelectedCourseId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-medium">Courses</h2>
          <p className="text-sm text-muted-foreground">Enrollments and per-course teacher assessment.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          render={<Link href={`/admin/students/${studentId}/report`} />}
          nativeButton={false}
        >
          View progress report
        </Button>
      </div>

      {enrollments.length === 0 ? (
        <EmptyState title="Not enrolled in any courses yet" description="Add a course below." />
      ) : (
        <ul className="space-y-2">
          {enrollments.map((enrollment) => (
            <EnrollmentRow key={enrollment.id} studentId={studentId} enrollment={enrollment} />
          ))}
        </ul>
      )}

      {addError ? (
        <Alert variant="destructive">
          <AlertDescription>{addError}</AlertDescription>
        </Alert>
      ) : null}

      {availableCourses.length > 0 ? (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-4">
          <div className="min-w-[220px] space-y-2">
            <p className="text-sm font-medium">Add a course</p>
            <Select
              items={Object.fromEntries(availableCourses.map((c) => [c.id, c.title]))}
              value={selectedCourseId}
              onValueChange={(value) => setSelectedCourseId(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a course" />
              </SelectTrigger>
              <SelectContent>
                {availableCourses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" disabled={!selectedCourseId || isAddPending} onClick={handleAdd}>
            {isAddPending ? "Adding…" : "Add"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function RatingSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Rating;
  onChange: (value: Rating) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <Select
        items={{ "": "Not set", ...RATING_LABELS }}
        value={value ?? ""}
        onValueChange={(next) => onChange((next || null) as Rating)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Not set" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Not set</SelectItem>
          {Object.entries(RATING_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function EnrollmentRow({ studentId, enrollment }: { studentId: string; enrollment: Enrollment }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    effort_rating: enrollment.effort_rating,
    participation_rating: enrollment.participation_rating,
    strengths: enrollment.strengths ?? "",
    areas_to_improve: enrollment.areas_to_improve ?? "",
    remarks: enrollment.remarks ?? "",
  });

  function resetForm() {
    setForm({
      effort_rating: enrollment.effort_rating,
      participation_rating: enrollment.participation_rating,
      strengths: enrollment.strengths ?? "",
      areas_to_improve: enrollment.areas_to_improve ?? "",
      remarks: enrollment.remarks ?? "",
    });
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateTeacherAssessment(studentId, enrollment.id, form);
      if (result.error) {
        setError(result.error);
        return;
      }
      setIsEditing(false);
      router.refresh();
    });
  }

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      const result = await removeEnrollment(studentId, enrollment.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{enrollment.course.title}</p>
          <p className="text-xs text-muted-foreground">{enrollment.course.level} Level</p>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              {hasAnyTeacherAssessment(enrollment) ? "Edit teacher assessment" : "Add teacher assessment"}
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={handleRemove}>
            Remove
          </Button>
        </div>
      </div>

      {isEditing ? (
        <div className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <RatingSelect
              label="Effort"
              value={form.effort_rating}
              onChange={(value) => setForm((f) => ({ ...f, effort_rating: value }))}
            />
            <RatingSelect
              label="Class participation"
              value={form.participation_rating}
              onChange={(value) => setForm((f) => ({ ...f, participation_rating: value }))}
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Strengths</p>
            <Textarea
              value={form.strengths}
              onChange={(event) => setForm((f) => ({ ...f, strengths: event.target.value }))}
              rows={2}
              placeholder="What this student does well"
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Areas to improve</p>
            <Textarea
              value={form.areas_to_improve}
              onChange={(event) => setForm((f) => ({ ...f, areas_to_improve: event.target.value }))}
              rows={2}
              placeholder="What this student should work on"
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Other comments</p>
            <Textarea
              value={form.remarks}
              onChange={(event) => setForm((f) => ({ ...f, remarks: event.target.value }))}
              rows={2}
              placeholder="Any other remarks for this course"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={isPending} onClick={handleSave}>
              {isPending ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => {
                resetForm();
                setIsEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : hasAnyTeacherAssessment(enrollment) ? (
        <dl className="mt-2 space-y-1 text-sm text-muted-foreground">
          {enrollment.effort_rating ? (
            <div>
              <span className="font-medium">Effort:</span> {RATING_LABELS[enrollment.effort_rating]}
            </div>
          ) : null}
          {enrollment.participation_rating ? (
            <div>
              <span className="font-medium">Class participation:</span>{" "}
              {RATING_LABELS[enrollment.participation_rating]}
            </div>
          ) : null}
          {enrollment.strengths ? (
            <div>
              <span className="font-medium">Strengths:</span> {enrollment.strengths}
            </div>
          ) : null}
          {enrollment.areas_to_improve ? (
            <div>
              <span className="font-medium">Areas to improve:</span> {enrollment.areas_to_improve}
            </div>
          ) : null}
          {enrollment.remarks ? (
            <div>
              <span className="font-medium">Other comments:</span> {enrollment.remarks}
            </div>
          ) : null}
        </dl>
      ) : null}

      {error ? (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </li>
  );
}
