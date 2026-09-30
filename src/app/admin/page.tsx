import Link from "next/link";
import { CheckSquareIcon, InboxIcon, UsersIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPendingApplicationCount } from "@/lib/applications";
import { getSiteSettings } from "@/lib/get-site-settings";
import { createClient } from "@/lib/supabase/server";

function StatIcon({ icon: Icon }: { icon: typeof InboxIcon }) {
  return (
    <div className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
      <Icon className="size-5" aria-hidden="true" />
    </div>
  );
}

export default async function AdminOverview() {
  const settings = await getSiteSettings();
  const needsSettings = !settings?.academy_name?.trim();

  const supabase = await createClient();
  const [{ count: activeStudentCount }, { count: waitingToBeMarkedCount }, pendingApplicationCount] =
    await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student").eq("is_active", true),
      supabase
        .from("submissions")
        .select("id", { count: "exact", head: true })
        .not("file_paths", "eq", "{}")
        .is("marks", null),
      getPendingApplicationCount(supabase),
    ]);

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

      <div className="grid max-w-3xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 space-y-0">
            <StatIcon icon={InboxIcon} />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/admin/applications" className="text-3xl font-semibold hover:underline">
              {pendingApplicationCount}
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3 space-y-0">
            <StatIcon icon={UsersIcon} />
            <CardTitle className="text-sm font-medium text-muted-foreground">Active students</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{activeStudentCount ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3 space-y-0">
            <StatIcon icon={CheckSquareIcon} />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Submissions waiting to be marked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/admin/marking" className="text-3xl font-semibold hover:underline">
              {waitingToBeMarkedCount ?? 0}
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
