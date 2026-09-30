import { AuthShell } from "@/components/auth-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MIN_PASSWORD_LENGTH } from "@/lib/validation/auth";
import { requirePasswordChangeUser } from "@/lib/auth";
import { ChangePasswordForm } from "./change-password-form";

export default async function ChangePasswordPage() {
  const profile = await requirePasswordChangeUser();

  return (
    <AuthShell>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{profile.must_change_password ? "Set a new password" : "Change password"}</CardTitle>
          <CardDescription>
            {profile.must_change_password
              ? "You need to choose your own password before using the portal."
              : `Choose a new password of at least ${MIN_PASSWORD_LENGTH} characters.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </AuthShell>
  );
}
