"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CountrySelect } from "@/components/country-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { COURSE_LEVEL_LABELS } from "@/lib/group-courses";
import { applicationSchema } from "@/lib/validation/applications";
import { submitApplication, type ApplyFormState } from "./actions";
import { HONEYPOT_FIELD } from "./honeypot";

const initialState: ApplyFormState = { error: null };

type Course = { id: string; title: string; level: "O" | "A" };
type Level = "O" | "A";

export function ApplyForm({
  courses,
  preselectedCourseId,
  preselectedLevel,
  applyToken,
}: {
  courses: Course[];
  preselectedCourseId: string | null;
  preselectedLevel: Level | null;
  applyToken: string;
}) {
  const [state, formAction, isPending] = useActionState(submitApplication, initialState);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [level, setLevel] = useState<Level | "">(preselectedLevel ?? "");
  const [courseIds, setCourseIds] = useState<string[]>(
    preselectedCourseId ? [preselectedCourseId] : [],
  );
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [sameAsPhone, setSameAsPhone] = useState(false);

  // Level is chosen first and decides which courses are offered, so a change of
  // mind must not leave a course from the other level selected.
  function handleLevelChange(event: React.ChangeEvent<HTMLSelectElement>) {
    setLevel(event.target.value as Level | "");
    setCourseIds([]);
  }

  function handlePhoneChange(event: React.ChangeEvent<HTMLInputElement>) {
    setPhone(event.target.value);
    if (sameAsPhone) setWhatsapp(event.target.value);
  }

  function handleSameAsPhoneChange(event: React.ChangeEvent<HTMLInputElement>) {
    const checked = event.target.checked;
    setSameAsPhone(checked);
    if (checked) setWhatsapp(phone);
  }

  function toggleCourse(courseId: string, checked: boolean) {
    setCourseIds((prev) => (checked ? [...prev, courseId] : prev.filter((id) => id !== courseId)));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const parsed = applicationSchema.safeParse({
      full_name: formData.get("full_name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      whatsapp: formData.get("whatsapp"),
      country: formData.get("country"),
      school: formData.get("school"),
      level: formData.get("level"),
      course_ids: formData.getAll("course_ids"),
      guardian_name: formData.get("guardian_name"),
      guardian_phone: formData.get("guardian_phone"),
      guardian_email: formData.get("guardian_email"),
      heard_about: formData.get("heard_about"),
    });

    if (parsed.success) {
      setFieldErrors({});
      return;
    }

    event.preventDefault();
    const map: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!(key in map)) map[key] = issue.message;
    }
    setFieldErrors(map);
  }

  const availableLevels = (["O", "A"] as const).filter((value) =>
    courses.some((course) => course.level === value),
  );
  const coursesForLevel = level ? courses.filter((course) => course.level === level) : [];

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-8" noValidate>
      <input type="hidden" name="apply_token" value={applyToken} />
      <HoneypotField />

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Your details</h2>

        <div className="space-y-2">
          <Label htmlFor="full_name">Full name</Label>
          <Input
            id="full_name"
            name="full_name"
            autoComplete="name"
            aria-invalid={Boolean(fieldErrors.full_name)}
          />
          {fieldErrors.full_name ? <FieldError>{fieldErrors.full_name}</FieldError> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(fieldErrors.email)}
          />
          <p className="text-xs text-muted-foreground">
            This becomes your login if your application is accepted.
          </p>
          {fieldErrors.email ? <FieldError>{fieldErrors.email}</FieldError> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone number</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={handlePhoneChange}
            aria-invalid={Boolean(fieldErrors.phone)}
          />
          {fieldErrors.phone ? <FieldError>{fieldErrors.phone}</FieldError> : null}
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="whatsapp">WhatsApp number (optional)</Label>
            <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <input type="checkbox" checked={sameAsPhone} onChange={handleSameAsPhoneChange} />
              Same as phone
            </label>
          </div>
          <Input
            id="whatsapp"
            name="whatsapp"
            type="tel"
            value={whatsapp}
            readOnly={sameAsPhone}
            aria-readonly={sameAsPhone}
            onChange={(event) => setWhatsapp(event.target.value)}
            aria-invalid={Boolean(fieldErrors.whatsapp)}
            className={sameAsPhone ? "bg-muted" : undefined}
          />
          {fieldErrors.whatsapp ? <FieldError>{fieldErrors.whatsapp}</FieldError> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <CountrySelect id="country" invalid={Boolean(fieldErrors.country)} />
          {fieldErrors.country ? <FieldError>{fieldErrors.country}</FieldError> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="school">Current school (optional)</Label>
          <Input id="school" name="school" aria-invalid={Boolean(fieldErrors.school)} />
          {fieldErrors.school ? <FieldError>{fieldErrors.school}</FieldError> : null}
        </div>
      </section>

      <section className="space-y-4 border-t border-border pt-6">
        <h2 className="text-lg font-medium">What you want to study</h2>

        <div className="space-y-2">
          <Label htmlFor="level">Level</Label>
          <select
            id="level"
            name="level"
            value={level}
            onChange={handleLevelChange}
            aria-invalid={Boolean(fieldErrors.level) || undefined}
            className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50"
          >
            <option value="">Select a level</option>
            {availableLevels.map((value) => (
              <option key={value} value={value}>
                {COURSE_LEVEL_LABELS[value]}
              </option>
            ))}
          </select>
          {fieldErrors.level ? <FieldError>{fieldErrors.level}</FieldError> : null}
        </div>

        <div className="space-y-2">
          <Label>Courses</Label>
          {!level ? (
            <p className="text-sm text-muted-foreground">Choose a level to see the courses.</p>
          ) : coursesForLevel.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No {COURSE_LEVEL_LABELS[level]} courses are open at the moment.
            </p>
          ) : (
            <div className="space-y-1.5">
              {coursesForLevel.map((course) => (
                <label key={course.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="course_ids"
                    value={course.id}
                    checked={courseIds.includes(course.id)}
                    onChange={(event) => toggleCourse(course.id, event.target.checked)}
                  />
                  {course.title}
                </label>
              ))}
            </div>
          )}
          {fieldErrors.course_ids ? <FieldError>{fieldErrors.course_ids}</FieldError> : null}
        </div>
      </section>

      <section className="space-y-4 border-t border-border pt-6">
        <div className="space-y-1">
          <h2 className="text-lg font-medium">Parent or guardian (optional)</h2>
          <p className="text-sm text-muted-foreground">
            So we can share your progress report with them.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="guardian_name">Guardian name</Label>
          <Input
            id="guardian_name"
            name="guardian_name"
            aria-invalid={Boolean(fieldErrors.guardian_name)}
          />
          {fieldErrors.guardian_name ? <FieldError>{fieldErrors.guardian_name}</FieldError> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="guardian_phone">Guardian phone</Label>
          <Input
            id="guardian_phone"
            name="guardian_phone"
            type="tel"
            aria-invalid={Boolean(fieldErrors.guardian_phone)}
          />
          {fieldErrors.guardian_phone ? <FieldError>{fieldErrors.guardian_phone}</FieldError> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="guardian_email">Guardian email</Label>
          <Input
            id="guardian_email"
            name="guardian_email"
            type="email"
            aria-invalid={Boolean(fieldErrors.guardian_email)}
          />
          {fieldErrors.guardian_email ? <FieldError>{fieldErrors.guardian_email}</FieldError> : null}
        </div>
      </section>

      <section className="space-y-4 border-t border-border pt-6">
        <div className="space-y-2">
          <Label htmlFor="heard_about">How did you hear about us? (optional)</Label>
          <Textarea
            id="heard_about"
            name="heard_about"
            rows={3}
            aria-invalid={Boolean(fieldErrors.heard_about)}
          />
          {fieldErrors.heard_about ? <FieldError>{fieldErrors.heard_about}</FieldError> : null}
        </div>
      </section>

      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <p className="text-sm text-muted-foreground">
        By applying you agree to our{" "}
        <Link href="/privacy" className="underline hover:text-foreground">
          Privacy Policy
        </Link>
        .
      </p>

      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? "Sending…" : "Send application"}
      </Button>
    </form>
  );
}

/**
 * Honeypot (SPEC §6). Hidden from people and from assistive technology, but
 * still present, focusable-free and fillable by a bot that populates every
 * input it finds. `display: none` is avoided because the better bots skip it;
 * this is clipped out of view instead.
 */
function HoneypotField() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -left-[9999px] h-px w-px overflow-hidden opacity-0"
    >
      <label htmlFor={HONEYPOT_FIELD}>Website</label>
      <input
        id={HONEYPOT_FIELD}
        type="text"
        name={HONEYPOT_FIELD}
        tabIndex={-1}
        autoComplete="off"
        defaultValue=""
      />
    </div>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-destructive">{children}</p>;
}
