"use client";

import { useActionState, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { studentSchema } from "@/lib/validation/students";
import { createStudent, type StudentFormState } from "./actions";

const initialState: StudentFormState = { error: null };

type Course = { id: string; title: string; level: "O" | "A" };
type Batch = { id: string; name: string };

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let result = "";
  for (let i = 0; i < 10; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

export function StudentForm({ courses, batches }: { courses: Course[]; batches: Batch[] }) {
  const [state, formAction, isPending] = useActionState(createStudent, initialState);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [sameAsPhone, setSameAsPhone] = useState(false);
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [password, setPassword] = useState("");

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
    const parsed = studentSchema.safeParse({
      full_name: formData.get("full_name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      whatsapp: formData.get("whatsapp"),
      country: formData.get("country"),
      school: formData.get("school"),
      guardian_name: formData.get("guardian_name"),
      guardian_phone: formData.get("guardian_phone"),
      guardian_email: formData.get("guardian_email"),
      course_ids: formData.getAll("course_ids"),
      batch_id: formData.get("batch_id"),
      password: formData.get("password"),
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

  const coursesByLevel: Record<"O" | "A", Course[]> = { O: [], A: [] };
  for (const course of courses) coursesByLevel[course.level].push(course);

  return (
    <form action={formAction} onSubmit={handleSubmit} className="max-w-xl space-y-6" noValidate>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" name="full_name" aria-invalid={Boolean(fieldErrors.full_name)} />
          {fieldErrors.full_name ? <FieldError>{fieldErrors.full_name}</FieldError> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" aria-invalid={Boolean(fieldErrors.email)} />
          {fieldErrors.email ? <FieldError>{fieldErrors.email}</FieldError> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone number</Label>
          <Input
            id="phone"
            name="phone"
            value={phone}
            onChange={handlePhoneChange}
            aria-invalid={Boolean(fieldErrors.phone)}
          />
          {fieldErrors.phone ? <FieldError>{fieldErrors.phone}</FieldError> : null}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="whatsapp">WhatsApp number</Label>
            <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <input type="checkbox" checked={sameAsPhone} onChange={handleSameAsPhoneChange} />
              Same as phone
            </label>
          </div>
          <Input
            id="whatsapp"
            name="whatsapp"
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
          <Input id="country" name="country" aria-invalid={Boolean(fieldErrors.country)} />
          {fieldErrors.country ? <FieldError>{fieldErrors.country}</FieldError> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="school">Current school</Label>
          <Input id="school" name="school" aria-invalid={Boolean(fieldErrors.school)} />
          {fieldErrors.school ? <FieldError>{fieldErrors.school}</FieldError> : null}
        </div>
      </div>

      <div className="space-y-4 border-t border-border pt-4">
        <p className="text-sm font-medium">Guardian (optional)</p>
        <div className="space-y-2">
          <Label htmlFor="guardian_name">Guardian name</Label>
          <Input id="guardian_name" name="guardian_name" aria-invalid={Boolean(fieldErrors.guardian_name)} />
          {fieldErrors.guardian_name ? <FieldError>{fieldErrors.guardian_name}</FieldError> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="guardian_phone">Guardian phone</Label>
          <Input id="guardian_phone" name="guardian_phone" aria-invalid={Boolean(fieldErrors.guardian_phone)} />
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
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <Label>Courses</Label>
        {(["O", "A"] as const).map((level) =>
          coursesByLevel[level].length > 0 ? (
            <div key={level} className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">{level} Level</p>
              {coursesByLevel[level].map((course) => (
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
          ) : null,
        )}
        {courses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No courses exist yet. Create one first.</p>
        ) : null}
        {fieldErrors.course_ids ? <FieldError>{fieldErrors.course_ids}</FieldError> : null}
      </div>

      <div className="space-y-2 border-t border-border pt-4">
        <Label htmlFor="batch_id">Batch</Label>
        <Select
          name="batch_id"
          items={{ "": "No batch", ...Object.fromEntries(batches.map((b) => [b.id, b.name])) }}
          value={batchId ?? ""}
          onValueChange={(value) => setBatchId(value)}
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

      <div className="space-y-2 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Temporary password</Label>
          <Button type="button" variant="outline" size="sm" onClick={() => setPassword(generatePassword())}>
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
          The student must change this on first login. Share it with them directly (e.g. WhatsApp).
        </p>
        {fieldErrors.password ? <FieldError>{fieldErrors.password}</FieldError> : null}
      </div>

      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating…" : "Add student"}
      </Button>
    </form>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-destructive">{children}</p>;
}
