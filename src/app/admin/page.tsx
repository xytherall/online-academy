import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSiteSettings } from "@/lib/get-site-settings";
import { createClient } from "@/lib/supabase/server";

export default async function AdminOverview() {
  const settings = await getSiteSettings();
  const needsSettings = !settings?.academy_name?.trim();

  const supabase = await createClient();
  const { count: activeStudentCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "student")
    .eq("is_active", true);

  return (
    <div className="space-y-6">
      {needsSettings ? (
        <Alert>
          <AlertTitle>Settings not filled in yet</AlertTitle>
          <AlertDescription>
            The academy name and other public details are empty.{" "}
            <Link href="/admin/settings">Fill in Settings</Link> so the public site and portal show real
            information.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="max-w-xs">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Active students</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">{activeStudentCount ?? 0}</p>
        </CardContent>
      </Card>
    </div>
  );
}
