"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/admin/empty-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { displayName } from "@/lib/display-name";
import { assignStudentToBatch, removeStudentFromBatch } from "../actions";

type StudentOption = { id: string; full_name: string | null; email: string };

export function BatchStudentsManager({
  batchId,
  assignedStudents,
  unassignedStudents,
}: {
  batchId: string;
  assignedStudents: StudentOption[];
  unassignedStudents: StudentOption[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  function handleAssign() {
    if (!selectedStudentId) return;
    setError(null);
    startTransition(async () => {
      const result = await assignStudentToBatch(batchId, selectedStudentId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSelectedStudentId(null);
      router.refresh();
    });
  }

  function handleRemove(studentId: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeStudentFromBatch(batchId, studentId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-medium">Students</h2>
        <p className="text-sm text-muted-foreground">Students assigned to this batch.</p>
      </div>

      {assignedStudents.length === 0 ? (
        <EmptyState title="No students assigned yet" description="Assign a student below." />
      ) : (
        <ul className="space-y-2">
          {assignedStudents.map((student) => (
            <li
              key={student.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{displayName(student)}</p>
                <p className="truncate text-xs text-muted-foreground">{student.email}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => handleRemove(student.id)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {unassignedStudents.length > 0 ? (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-card p-4">
          <div className="min-w-[220px] space-y-2">
            <p className="text-sm font-medium">Assign a student</p>
            <Select
              items={Object.fromEntries(unassignedStudents.map((s) => [s.id, displayName(s)]))}
              value={selectedStudentId}
              onValueChange={(value) => setSelectedStudentId(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a student" />
              </SelectTrigger>
              <SelectContent>
                {unassignedStudents.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {displayName(student)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" disabled={!selectedStudentId || isPending} onClick={handleAssign}>
            {isPending ? "Assigning…" : "Assign"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
