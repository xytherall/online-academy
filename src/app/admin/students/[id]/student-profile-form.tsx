"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { CountrySelect } from "@/components/country-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Tables } from "@/lib/supabase/database.types";
import { studentProfileUpdateSchema } from "@/lib/validation/students";
import { updateStudentProfile, type StudentFormState } from "../actions";

const initialState: StudentFormState = { error: null };

type Profile = Tables<"profiles">;

export function StudentProfileForm({ student }: { student: Profile }) {
  const action = updateStudentProfile.bind(null, student.id);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (state.success) toast.success("Saved");
  }, [state]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const parsed = studentProfileUpdateSchema.safeParse({
      full_name: formData.get("full_name"),
      phone: formData.get("phone"),
      whatsapp: formData.get("whatsapp"),
      country: formData.get("country"),
      school: formData.get("school"),
      guardian_name: formData.get("guardian_name"),
      guardian_phone: formData.get("guardian_phone"),
      guardian_email: formData.get("guardian_email"),
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

  return (
    <form action={formAction} onSubmit={handleSubmit} className="max-w-xl space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="full_name">Full name</Label>
        <Input
          id="full_name"
          name="full_name"
          defaultValue={student.full_name ?? ""}
          aria-invalid={Boolean(fieldErrors.full_name)}
        />
        {fieldErrors.full_name ? <FieldError>{fieldErrors.full_name}</FieldError> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone number</Label>
        <Input
          id="phone"
          name="phone"
          defaultValue={student.phone ?? ""}
          aria-invalid={Boolean(fieldErrors.phone)}
        />
        {fieldErrors.phone ? <FieldError>{fieldErrors.phone}</FieldError> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="whatsapp">WhatsApp number</Label>
        <Input
          id="whatsapp"
          name="whatsapp"
          defaultValue={student.whatsapp ?? ""}
          aria-invalid={Boolean(fieldErrors.whatsapp)}
        />
        {fieldErrors.whatsapp ? <FieldError>{fieldErrors.whatsapp}</FieldError> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="country">Country</Label>
        <CountrySelect
          id="country"
          defaultValue={student.country}
          invalid={Boolean(fieldErrors.country)}
        />
        {fieldErrors.country ? <FieldError>{fieldErrors.country}</FieldError> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="school">Current school</Label>
        <Input
          id="school"
          name="school"
          defaultValue={student.school ?? ""}
          aria-invalid={Boolean(fieldErrors.school)}
        />
        {fieldErrors.school ? <FieldError>{fieldErrors.school}</FieldError> : null}
      </div>

      <div className="space-y-4 border-t border-border pt-4">
        <p className="text-sm font-medium">Guardian</p>
        <div className="space-y-2">
          <Label htmlFor="guardian_name">Guardian name</Label>
          <Input
            id="guardian_name"
            name="guardian_name"
            defaultValue={student.guardian_name ?? ""}
            aria-invalid={Boolean(fieldErrors.guardian_name)}
          />
          {fieldErrors.guardian_name ? <FieldError>{fieldErrors.guardian_name}</FieldError> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="guardian_phone">Guardian phone</Label>
          <Input
            id="guardian_phone"
            name="guardian_phone"
            defaultValue={student.guardian_phone ?? ""}
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
            defaultValue={student.guardian_email ?? ""}
            aria-invalid={Boolean(fieldErrors.guardian_email)}
          />
          {fieldErrors.guardian_email ? <FieldError>{fieldErrors.guardian_email}</FieldError> : null}
        </div>
      </div>

      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-destructive">{children}</p>;
}
