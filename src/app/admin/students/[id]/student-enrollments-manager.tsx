"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/admin/empty-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { addEnrollment, removeEnrollment, updateEnrollmentRemarks } from "../actions";

type Course = { id: string; title: string; level: "O" | "A" };
type Enrollment = { id: string; remarks: string | null; course: Course };

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
      <div>
        <h2 className="font-medium">Courses</h2>
        <p className="text-sm text-muted-foreground">Enrollments and per-course remarks.</p>
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

function EnrollmentRow({ studentId, enrollment }: { studentId: string; enrollment: Enrollment }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [remarks, setRemarks] = useState(enrollment.remarks ?? "");

  function handleSaveRemarks() {
    setError(null);
    startTransition(async () => {
      const result = await updateEnrollmentRemarks(studentId, enrollment.id, remarks);
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
              {enrollment.remarks ? "Edit remarks" : "Add remarks"}
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={handleRemove}>
            Remove
          </Button>
        </div>
      </div>

      {isEditing ? (
        <div className="mt-3 space-y-2">
          <Textarea
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            rows={3}
            placeholder="Remarks for this course"
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={isPending} onClick={handleSaveRemarks}>
              {isPending ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => {
                setRemarks(enrollment.remarks ?? "");
                setIsEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : enrollment.remarks ? (
        <p className="mt-2 text-sm text-muted-foreground">{enrollment.remarks}</p>
      ) : null}

      {error ? (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </li>
  );
}
