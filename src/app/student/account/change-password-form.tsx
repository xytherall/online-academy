"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changeOwnPasswordSchema } from "@/lib/validation/auth";
import { changeOwnPassword, type ChangeOwnPasswordState } from "./actions";

type FieldErrors = { currentPassword?: string; password?: string; confirmPassword?: string };

const initialState: ChangeOwnPasswordState = { error: null, success: false };

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(changeOwnPassword, initialState);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const parsed = changeOwnPasswordSchema.safeParse({
      currentPassword: formData.get("currentPassword"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    if (parsed.success) {
      setFieldErrors({});
      return;
    }

    event.preventDefault();
    const flattened = parsed.error.flatten().fieldErrors;
    setFieldErrors({
      currentPassword: flattened.currentPassword?.[0],
      password: flattened.password?.[0],
      confirmPassword: flattened.confirmPassword?.[0],
    });
  }

  return (
    <form
      key={state.success ? "reset" : "form"}
      action={formAction}
      onSubmit={handleSubmit}
      className="space-y-4"
      noValidate
    >
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(fieldErrors.currentPassword)}
          aria-describedby={fieldErrors.currentPassword ? "current-password-error" : undefined}
        />
        {fieldErrors.currentPassword ? (
          <p id="current-password-error" className="text-sm text-destructive">
            {fieldErrors.currentPassword}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(fieldErrors.password)}
          aria-describedby={fieldErrors.password ? "password-error" : undefined}
        />
        {fieldErrors.password ? (
          <p id="password-error" className="text-sm text-destructive">
            {fieldErrors.password}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(fieldErrors.confirmPassword)}
          aria-describedby={fieldErrors.confirmPassword ? "confirm-password-error" : undefined}
        />
        {fieldErrors.confirmPassword ? (
          <p id="confirm-password-error" className="text-sm text-destructive">
            {fieldErrors.confirmPassword}
          </p>
        ) : null}
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">
          Password changed.
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Change password"}
      </Button>
    </form>
  );
}
