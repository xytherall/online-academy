"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { generatePassword } from "@/lib/generate-password";
import { COURSE_LEVEL_LABELS } from "@/lib/group-courses";
import { acceptApplicationSchema } from "@/lib/validation/applications";
import { acceptApplication, deleteApplication, rejectApplication } from "../actions";

type Course = { id: string; title: string; level: "O" | "A" };
type Batch = { id: string; name: string };
type Status = "pending" | "accepted" | "rejected";

type Accepted = { email: string; password: string; loginUrl: string; studentId: string };

/**
 * Owns the whole review area for all three statuses, rather than one component
 * per status.
 *
 * That matters for the temporary password: accepting calls router.refresh(), so
 * the server re-renders this route with status 'accepted'. If the accept form
 * were its own component the server stopped rendering at that point, React
 * would unmount it and take the one-and-only showing of the password with it.
 * Keeping one component mounted across the status change means the "just
 * accepted" state survives the refresh.
 */
export function ApplicationReview({
  applicationId,
  status,
  studentId,
  courses,
  batches,
  initialCourseIds,
}: {
  applicationId: string;
  status: Status;
  studentId: string | null;
  courses: Course[];
  batches: Batch[];
  initialCourseIds: string[];
}) {
  const [accepted, setAccepted] = useState<Accepted | null>(null);

  if (accepted) return <LoginDetailsPanel accepted={accepted} />;

  if (status === "pending") {
    return (
      <div className="space-y-4">
        <AcceptApplicationForm
          applicationId={applicationId}
          courses={courses}
          batches={batches}
          initialCourseIds={initialCourseIds}
          onAccepted={setAccepted}
        />
        <div className="flex flex-wrap items-center gap-3">
          <RejectApplicationButton applicationId={applicationId} />
          <p className="text-sm text-muted-foreground">
            Rejecting creates no account and sends nothing to the applicant.
          </p>
        </div>
      </div>
    );
  }

  if (status === "accepted") {
    return (
      <div className="space-y-3 rounded-lg border border-border p-5">
        <h2 className="font-medium">Accepted</h2>
        <p className="text-sm text-muted-foreground">
          This applicant has a student account. Reset their password from their student page if they
          need a new one.
        </p>
        {studentId ? (
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/admin/students/${studentId}`} />}
            nativeButton={false}
          >
            Open student page
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-5">
      <h2 className="font-medium">Rejected</h2>
      <p className="text-sm text-muted-foreground">
        No account was created. You can delete this application to remove the applicant&apos;s
        details for good.
      </p>
      <DeleteApplicationButton applicationId={applicationId} />
    </div>
  );
}

function AcceptApplicationForm({
  applicationId,
  courses,
  batches,
  initialCourseIds,
  onAccepted,
}: {
  applicationId: string;
  courses: Course[];
  batches: Batch[];
  initialCourseIds: string[];
  onAccepted: (accepted: Accepted) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [courseIds, setCourseIds] = useState<string[]>(initialCourseIds);
  const [batchId, setBatchId] = useState("");
  const [password, setPassword] = useState("");

  function toggleCourse(courseId: string, checked: boolean) {
    setCourseIds((prev) => (checked ? [...prev, courseId] : prev.filter((id) => id !== courseId)));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = { course_ids: courseIds, batch_id: batchId, password };

    const parsed = acceptApplicationSchema.safeParse(input);
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".");
        if (!(key in map)) map[key] = issue.message;
      }
      setFieldErrors(map);
      return;
    }

    setFieldErrors({});
    setError(null);

    startTransition(async () => {
      const result = await acceptApplication(applicationId, parsed.data);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Handed to the parent, which stays mounted across the refresh below —
      // this is the one and only time the temporary password can be read.
      onAccepted({
        email: result.email,
        password: result.password,
        loginUrl: result.loginUrl,
        studentId: result.studentId,
      });
      router.refresh();
    });
  }

  const coursesByLevel = (["O", "A"] as const)
    .map((level) => [level, courses.filter((course) => course.level === level)] as const)
    .filter(([, list]) => list.length > 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-border p-5" noValidate>
      <div className="space-y-1">
        <h2 className="font-medium">Accept this application</h2>
        <p className="text-sm text-muted-foreground">
          This creates the student&apos;s account and enrolls them. You will get a temporary password
          to send them, shown once.
        </p>
      </div>

      <div className="space-y-3">
        <Label>Courses</Label>
        {coursesByLevel.length === 0 ? (
          <p className="text-sm text-muted-foreground">No courses exist yet. Create one first.</p>
        ) : (
          coursesByLevel.map(([level, list]) => (
            <div key={level} className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                {COURSE_LEVEL_LABELS[level]}
              </p>
              {list.map((course) => (
                <label key={course.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={courseIds.includes(course.id)}
                    onChange={(event) => toggleCourse(course.id, event.target.checked)}
                  />
                  {course.title}
                </label>
              ))}
            </div>
          ))
        )}
        <p className="text-xs text-muted-foreground">
          Pre-filled from what the applicant asked for. Adjust if needed.
        </p>
        {fieldErrors.course_ids ? <FieldError>{fieldErrors.course_ids}</FieldError> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="batch_id">Batch (optional)</Label>
        <Select
          name="batch_id"
          items={{ "": "No batch", ...Object.fromEntries(batches.map((b) => [b.id, b.name])) }}
          value={batchId}
          onValueChange={(value) => setBatchId(value ?? "")}
        >
          <SelectTrigger id="batch_id" className="w-full">
            <SelectValue placeholder="No batch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">No batch</SelectItem>
            {batches.map((batch) => (
              <SelectItem key={batch.id} value={batch.id}>
                {batch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Temporary password</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPassword(generatePassword())}
          >
            Generate
          </Button>
        </div>
        <Input
          id="password"
          name="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          aria-invalid={Boolean(fieldErrors.password)}
        />
        <p className="text-xs text-muted-foreground">
          The student must change this on first login.
        </p>
        {fieldErrors.password ? <FieldError>{fieldErrors.password}</FieldError> : null}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating account…" : "Accept and create account"}
      </Button>
    </form>
  );
}

/**
 * Shown once, straight after accepting. The password is never stored, so if this
 * is lost the admin resets it from the student's page instead.
 *
 * Copy-to-clipboard only: putting a password in a wa.me or mailto link would
 * leak it into a URL, a browser history entry and possibly a third party's logs.
 */
function LoginDetailsPanel({ accepted }: { accepted: Accepted }) {
  const message = [
    "Your application has been accepted. You can sign in here:",
    accepted.loginUrl,
    "",
    `Email: ${accepted.email}`,
    `Temporary password: ${accepted.password}`,
    "",
    "You will be asked to choose your own password when you first sign in.",
  ].join("\n");

  return (
    <div className="space-y-4 rounded-lg border border-border p-5">
      <div className="space-y-1">
        <h2 className="font-medium">Account created</h2>
        <p className="text-sm text-muted-foreground">
          Send these details to the student. The password is shown only now — if you lose it, reset it
          from their student page.
        </p>
      </div>

      <dl className="space-y-2 text-sm">
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-muted-foreground">Email:</dt>
          <dd className="font-medium">{accepted.email}</dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-muted-foreground">Temporary password:</dt>
          <dd className="font-mono font-medium">{accepted.password}</dd>
        </div>
      </dl>

      <div className="space-y-2">
        <Label htmlFor="login_message">Login message</Label>
        <Textarea id="login_message" readOnly rows={8} value={message} className="font-mono text-xs" />
        <CopyButton value={message} label="Copy login message" copiedLabel="Copied" />
      </div>

      <Button
        variant="outline"
        size="sm"
        render={<Link href={`/admin/students/${accepted.studentId}`} />}
        nativeButton={false}
      >
        Open student page
      </Button>
    </div>
  );
}

function RejectApplicationButton({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await rejectApplication(applicationId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setError(null);
      }}
    >
      <DialogTrigger render={<Button variant="outline">Reject</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject this application?</DialogTitle>
          <DialogDescription>
            No account is created and the applicant is not notified by this site — contact them
            yourself if you want to. You can delete the application afterwards.
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm} disabled={isPending}>
            {isPending ? "Rejecting…" : "Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteApplicationButton({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteApplication(applicationId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/admin/applications");
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setError(null);
      }}
    >
      <DialogTrigger render={<Button variant="outline">Delete</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this application?</DialogTitle>
          <DialogDescription>
            This permanently removes the applicant&apos;s contact and guardian details. This cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm} disabled={isPending}>
            {isPending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-destructive">{children}</p>;
}
