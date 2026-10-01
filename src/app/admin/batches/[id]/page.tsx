import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/server";
import { BatchForm } from "../batch-form";
import { BatchStudentsManager } from "./batch-students-manager";

export const metadata: Metadata = { title: "Edit batch" };

export default async function EditBatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: batch, error: batchError },
    { data: assignedStudents, error: assignedError },
    { data: unassignedStudents, error: unassignedError },
  ] = await Promise.all([
    supabase.from("batches").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "student")
      .eq("batch_id", id)
      .order("full_name"),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "student")
      .is("batch_id", null)
      .order("full_name"),
  ]);

  if (batchError) {
    return <p className="text-sm text-destructive">Could not load this batch. Please refresh the page.</p>;
  }
  if (!batch) notFound();

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">{batch.name}</h1>

      <BatchForm mode="edit" batch={batch} />

      <Separator />

      {assignedError || unassignedError ? (
        <p className="text-sm text-destructive">Could not load students. Please refresh the page.</p>
      ) : (
        <BatchStudentsManager
          batchId={batch.id}
          assignedStudents={assignedStudents ?? []}
          unassignedStudents={unassignedStudents ?? []}
        />
      )}
    </div>
  );
}
