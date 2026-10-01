import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/admin/empty-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { DeleteBatchButton } from "./batch-row-actions";

export const metadata: Metadata = { title: "Batches" };

export default async function AdminBatchesPage() {
  const supabase = await createClient();
  const [{ data: batches, error }, { data: studentCounts }] = await Promise.all([
    supabase.from("batches").select("*").order("name"),
    supabase.from("profiles").select("batch_id").eq("role", "student").not("batch_id", "is", null),
  ]);

  const countByBatch = new Map<string, number>();
  for (const row of studentCounts ?? []) {
    if (!row.batch_id) continue;
    countByBatch.set(row.batch_id, (countByBatch.get(row.batch_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Batches</h1>
        <Button render={<Link href="/admin/batches/new" />} nativeButton={false}>New batch</Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>Could not load batches. Please refresh the page.</AlertDescription>
        </Alert>
      ) : batches && batches.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Notes</TableHead>
              <TableHead>Students</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.map((batch) => (
              <TableRow key={batch.id}>
                <TableCell>
                  <Link href={`/admin/batches/${batch.id}`} className="font-medium hover:underline">
                    {batch.name}
                  </Link>
                </TableCell>
                <TableCell className="hidden max-w-xs truncate sm:table-cell">{batch.notes ?? "—"}</TableCell>
                <TableCell>{countByBatch.get(batch.id) ?? 0}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" render={<Link href={`/admin/batches/${batch.id}`} />} nativeButton={false}>
                      Edit
                    </Button>
                    <DeleteBatchButton batchId={batch.id} batchName={batch.name} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyState
          title="No batches yet"
          description="Create your first batch to group students, e.g. by country."
          action={
            <Button render={<Link href="/admin/batches/new" />} nativeButton={false} className="mt-2">
              New batch
            </Button>
          }
        />
      )}
    </div>
  );
}
