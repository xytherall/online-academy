import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { dashboardPathFor, getCurrentProfile } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ deactivated?: string; reason?: string }>;
}) {
  const profile = await getCurrentProfile();

  if (profile) {
    if (!profile.is_active) redirect("/auth/signout?reason=deactivated");
    if (profile.must_change_password) redirect("/change-password");
    const destination = dashboardPathFor(profile.role);
    if (destination) redirect(destination);
  }

  const { deactivated, reason } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Enter your details to access the portal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {deactivated ? (
            <p role="alert" className="text-sm text-destructive">
              This account has been deactivated. Please contact the academy.
            </p>
          ) : null}
          {reason === "no-access" ? (
            <p role="alert" className="text-sm text-destructive">
              This account has no portal access. Please contact the academy.
            </p>
          ) : null}
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
