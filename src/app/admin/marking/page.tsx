import type { Metadata } from "next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/empty-state";
import { LocalDateTime } from "@/components/local-date-time";
import { PortalListItem } from "@/components/portal/portal-list";
import { requireAdmin } from "@/lib/auth";
import { displayName } from "@/lib/display-name";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Marking" };

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
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-[-0.02em] sm:text-3xl">Marking</h1>
        <p className="text-sm text-muted-foreground">Work students have handed in that still needs marks, oldest first.</p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>Could not load the marking queue. Please refresh the page.</AlertDescription>
        </Alert>
      ) : !submissions || submissions.length === 0 ? (
        <EmptyState title="Nothing to mark" description="All submitted work has been marked." />
      ) : (
        <ul className="space-y-2.5">
          {submissions.map((submission) =>
            submission.assessment ? (
              <li key={submission.id}>
                <PortalListItem
                  href={`/admin/assessments/${submission.assessment.id}`}
                  title={submission.student ? displayName(submission.student) : "Unknown student"}
                  details={[
                    `${submission.assessment.title} · ${submission.assessment.course?.title ?? "Unknown course"}`,
                    submission.submitted_at ? (
                      <>
                        Handed in <LocalDateTime iso={submission.submitted_at} />
                      </>
                    ) : null,
                  ]}
                  aside={
                    <span className="rounded-full bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground">
                      Mark
                    </span>
                  }
                />
              </li>
            ) : null,
          )}
        </ul>      )}
    </div>
  );
}
