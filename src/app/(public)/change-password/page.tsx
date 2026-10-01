import { AuthShell } from "@/components/auth-shell";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/public/page-header";
import { MIN_PASSWORD_LENGTH } from "@/lib/validation/auth";
import { requirePasswordChangeUser } from "@/lib/auth";
import { ChangePasswordForm } from "./change-password-form";

export default async function ChangePasswordPage() {
  const profile = await requirePasswordChangeUser();

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        eyebrow="Account"
        title={profile.must_change_password ? "Set a new password" : "Change password"}
        description={
          profile.must_change_password
            ? "You need to choose your own password before using the portal."
            : `Choose a new password of at least ${MIN_PASSWORD_LENGTH} characters.`
        }
      />
      <AuthShell>
        <Card className="w-full">
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </AuthShell>
    </div>
  );
}
