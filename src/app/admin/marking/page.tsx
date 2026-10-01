import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/admin/empty-state";
import { LocalDateTime } from "@/components/local-date-time";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { displayName } from "@/lib/display-name";
import { createClient } from "@/lib/supabase/server";

export default async function AdminMarkingQueue() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: submissions, error } = await supabase
    .from("submissions")
    .select(
      "id, submitted_at, assessment:assessments(id, title, course:courses(title)), student:profiles!submissions_student_id_fkey(full_name, email)",
    )
    .not("file_paths", "eq", "{}")
    .is("marks", null)
    .order("submitted_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Marking</h1>
        <p className="text-sm text-muted-foreground">Submissions waiting to be marked, across all courses.</p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>Could not load the marking queue. Please refresh the page.</AlertDescription>
        </Alert>
      ) : !submissions || submissions.length === 0 ? (
        <EmptyState title="Nothing to mark" description="All submitted work has been marked." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assessment</TableHead>
                <TableHead className="hidden sm:table-cell">Course</TableHead>
                <TableHead>Student</TableHead>
                <TableHead className="hidden sm:table-cell">Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((submission) =>
                submission.assessment ? (
                  <TableRow key={submission.id}>
                    <TableCell>
                      <Link
                        href={`/admin/assessments/${submission.assessment.id}`}
                        className="font-medium hover:underline"
                      >
                        {submission.assessment.title}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {submission.assessment.course?.title ?? "Unknown course"}
                    </TableCell>
                    <TableCell>
                      {submission.student ? displayName(submission.student) : "Unknown student"}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {submission.submitted_at ? <LocalDateTime iso={submission.submitted_at} /> : "—"}
                    </TableCell>
                  </TableRow>
                ) : null,
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
