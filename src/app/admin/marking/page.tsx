import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/admin/empty-state";
import { LocalDateTime } from "@/components/local-date-time";
import { requireAdmin } from "@/lib/auth";
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
        <ul className="space-y-2">
          {submissions.map((submission) =>
            submission.assessment ? (
              <li key={submission.id} className="rounded-lg border border-border p-3">
                <Link href={`/admin/assessments/${submission.assessment.id}`} className="font-medium hover:underline">
                  {submission.assessment.title}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {submission.assessment.course?.title ?? "Unknown course"} ·{" "}
                  {submission.student?.full_name ?? submission.student?.email ?? "Unknown student"}
                  {submission.submitted_at ? (
                    <>
                      {" "}
                      · Submitted <LocalDateTime iso={submission.submitted_at} />
                    </>
                  ) : null}
                </p>
              </li>
            ) : null,
          )}
        </ul>
      )}
    </div>
  );
}
