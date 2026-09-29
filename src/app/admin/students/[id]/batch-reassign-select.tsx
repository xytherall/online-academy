"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { reassignStudentBatch } from "../actions";

const NO_BATCH = "__none__";

export function BatchReassignSelect({
  studentId,
  batches,
  currentBatchId,
}: {
  studentId: string;
  batches: { id: string; name: string }[];
  currentBatchId: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(currentBatchId ?? NO_BATCH);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: string | null) {
    const nextValue = next ?? NO_BATCH;
    setValue(nextValue);
    setError(null);
    startTransition(async () => {
      const result = await reassignStudentBatch(studentId, nextValue === NO_BATCH ? null : nextValue);
      if (result.error) {
        setError(result.error);
        setValue(currentBatchId ?? NO_BATCH);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Select
        items={{ [NO_BATCH]: "No batch", ...Object.fromEntries(batches.map((b) => [b.id, b.name])) }}
        value={value}
        onValueChange={handleChange}
        disabled={isPending}
      >
        <SelectTrigger className="w-full max-w-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_BATCH}>No batch</SelectItem>
          {batches.map((batch) => (
            <SelectItem key={batch.id} value={batch.id}>{batch.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
