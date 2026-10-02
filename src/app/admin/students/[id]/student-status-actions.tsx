"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { generatePassword } from "@/lib/generate-password";
import { adminResetPasswordSchema } from "@/lib/validation/students";
import { resetStudentPassword, setStudentActive } from "../actions";

export function StudentStatusActions({ studentId, isActive }: { studentId: string; isActive: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <ResetPasswordButton studentId={studentId} />
      <ToggleActiveButton studentId={studentId} isActive={isActive} />
    </div>
  );
}

function ToggleActiveButton({ studentId, isActive }: { studentId: string; isActive: boolean }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm() {
    startTransition(async () => {
      const result = await setStudentActive(studentId, !isActive);
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success(isActive ? "Deactivated" : "Reactivated");
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
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            {isActive ? "Deactivate" : "Reactivate"}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isActive ? "Deactivate this student?" : "Reactivate this student?"}</DialogTitle>
          <DialogDescription>
            {isActive
              ? "They will no longer be able to log in. Their data is kept and can be reactivated later."
              : "They will be able to log in again."}
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={isActive ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? "Saving…" : isActive ? "Deactivate" : "Reactivate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordButton({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = adminResetPasswordSchema.safeParse({ password });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Please check the password and try again.");
      return;
    }
    setFieldError(null);
    setServerError(null);
    startTransition(async () => {
      const result = await resetStudentPassword(studentId, parsed.data.password);
      if (result.error) {
        setServerError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success("Password reset");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setPassword("");
          setFieldError(null);
          setServerError(null);
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm">Reset password</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            The student must change this on next login. Share it with them directly (e.g. WhatsApp).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          <div className="flex items-center justify-between">
            <Label htmlFor="reset-password">New temporary password</Label>
            <Button type="button" variant="outline" size="sm" onClick={() => setPassword(generatePassword())}>
              Generate
            </Button>
          </div>
          <Input
            id="reset-password"
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            aria-invalid={Boolean(fieldError)}
          />
          {fieldError ? <p className="text-sm text-destructive">{fieldError}</p> : null}
          {serverError ? (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Reset password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
