import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LocalDateTime } from "@/components/local-date-time";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getApplication } from "@/lib/applications";
import { displayName } from "@/lib/display-name";
import { COURSE_LEVEL_LABELS } from "@/lib/group-courses";
import { applicationStatusBadgeVariant } from "@/lib/status-badge";
import { createClient } from "@/lib/supabase/server";
import { ApplicationReview } from "./application-review";

const STATUS_LABELS = { pending: "Pending", accepted: "Accepted", rejected: "Rejected" } as const;

export const metadata: Metadata = { title: "Application" };

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const application = await getApplication(supabase, id);
  if (!application) notFound();

  const [{ data: chosenCourses }, { data: allCourses }, { data: batches }, { data: reviewer }] =
    await Promise.all([
      supabase.from("courses").select("id, title, level").in("id", application.course_ids),
      supabase.from("courses").select("id, title, level").order("level").order("title"),
      supabase.from("batches").select("id, name").order("name"),
      application.reviewed_by
        ? supabase.from("profiles").select("full_name, email").eq("id", application.reviewed_by).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  return (
    <div className="max-w-3xl space-y-8">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">{application.full_name}</h1>
          <Badge variant={applicationStatusBadgeVariant(application.status)}>
            {STATUS_LABELS[application.status]}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Received <LocalDateTime iso={application.created_at} />
          {application.reviewed_at ? (
            <>
              {" · reviewed "}
              <LocalDateTime iso={application.reviewed_at} />
              {reviewer ? ` by ${displayName(reviewer)}` : ""}
            </>
          ) : null}
        </p>
      </div>

      <Section title="Student">
        <Field label="Full name" value={application.full_name} />
        <Field label="Email" value={application.email} />
        <Field label="Phone" value={application.phone} />
        <Field label="WhatsApp" value={application.whatsapp} />
        <Field label="Country" value={application.country} />
        <Field label="Current school" value={application.school} />
      </Section>

      <Section title="Study">
        <Field label="Level" value={COURSE_LEVEL_LABELS[application.level]} />
        <div className="space-y-1">
          <dt className="text-sm text-muted-foreground">Courses applied for</dt>
          <dd className="text-sm">
            {chosenCourses && chosenCourses.length > 0 ? (
              <ul className="space-y-0.5">
                {chosenCourses.map((course) => (
                  <li key={course.id}>
                    <Link href={`/admin/courses/${course.id}`} className="hover:underline">
                      {course.title}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              // A course can be deleted after an application arrives.
              <span className="text-muted-foreground">
                The chosen courses are no longer available.
              </span>
            )}
          </dd>
        </div>
      </Section>

      <Section title="Guardian">
        <Field label="Guardian name" value={application.guardian_name} />
        <Field label="Guardian phone" value={application.guardian_phone} />
        <Field label="Guardian email" value={application.guardian_email} />
      </Section>

      <Section title="Other">
        <Field label="How they heard about us" value={application.heard_about} />
      </Section>

      <Separator />

      <ApplicationReview
        applicationId={application.id}
        status={application.status}
        studentId={application.student_id}
        courses={allCourses ?? []}
        batches={batches ?? []}
        initialCourseIds={(chosenCourses ?? []).map((course) => course.id)}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <dl className="grid gap-3 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="space-y-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words">
        {value?.trim() ? value : <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  );
}
