import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireStudent } from "@/lib/auth";
import { getBatchName } from "@/lib/student";
import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = { title: "Account" };

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value ?? "—"}</dd>
    </div>
  );
}

export default async function StudentAccountPage() {
  const profile = await requireStudent();
  const batchName = await getBatchName(profile.batch_id);

  return (
    <div className="max-w-xl space-y-8">
      <h1 className="text-xl font-semibold">Account</h1>

      <Card>
        <CardHeader>
          <CardTitle>Your details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full name" value={profile.full_name} />
            <Field label="Email" value={profile.email} />
            <Field label="Phone" value={profile.phone} />
            <Field label="WhatsApp" value={profile.whatsapp} />
            <Field label="Country" value={profile.country} />
            <Field label="School" value={profile.school} />
            <Field label="Batch" value={batchName} />
            <Field label="Guardian name" value={profile.guardian_name} />
            <Field label="Guardian phone" value={profile.guardian_phone} />
            <Field label="Guardian email" value={profile.guardian_email} />
          </dl>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
