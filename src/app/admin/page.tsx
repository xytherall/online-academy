import Link from "next/link";
import {
  ArrowRightIcon,
  BookPlusIcon,
  CheckSquareIcon,
  InboxIcon,
  MegaphoneIcon,
  UserPlusIcon,
  UsersIcon,
  VideoIcon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PortalSection } from "@/components/portal/portal-list";
import { getPendingApplicationCount } from "@/lib/applications";
import { getSiteSettings } from "@/lib/get-site-settings";
import { createClient } from "@/lib/supabase/server";

const QUICK_ACTIONS = [
  { href: "/admin/students/new", label: "Add a student", icon: UserPlusIcon },
  { href: "/admin/courses/new", label: "Create a course", icon: BookPlusIcon },
  { href: "/admin/announcements", label: "Post an announcement", icon: MegaphoneIcon },
  { href: "/admin/live-classes", label: "Schedule a live class", icon: VideoIcon },
];

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
    <div className="mx-auto w-full max-w-5xl space-y-10">
      <h1 className="font-heading text-2xl font-bold tracking-[-0.02em] sm:text-3xl">Overview</h1>

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

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          href="/admin/applications"
          icon={InboxIcon}
          label="New applications"
          value={pendingApplicationCount}
          action="Review applications"
        />
        <StatCard
          href="/admin/marking"
          icon={CheckSquareIcon}
          label="Work to mark"
          value={waitingToBeMarkedCount ?? 0}
          action="Start marking"
        />
        <StatCard
          href="/admin/students"
          icon={UsersIcon}
          label="Active students"
          value={activeStudentCount ?? 0}
          action="See students"
        />
      </div>

      <PortalSection title="Quick actions">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="hover-lift flex items-center gap-3 rounded-2xl border border-border bg-card p-4 font-semibold"
            >
              <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                <Icon className="size-5" />
              </span>
              {label}
            </Link>
          ))}
        </div>
      </PortalSection>
    </div>
  );
}

function StatCard({
  href,
  icon: Icon,
  label,
  value,
  action,
}: {
  href: string;
  icon: typeof InboxIcon;
  label: string;
  value: number;
  action: string;
}) {
  return (
    <Link
      href={href}
      className="hover-lift hover-arrow-group flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 sm:p-6"
    >
      <span className="flex items-center gap-3">
        <span aria-hidden className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
          <Icon className="size-5" />
        </span>
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </span>
      <span className="font-display text-4xl font-extrabold tracking-[-0.03em] tabular-nums">{value}</span>
      <span className="mt-auto flex items-center gap-1.5 text-sm font-semibold text-primary">
        {action}
        <ArrowRightIcon aria-hidden className="hover-arrow size-4" />
      </span>
    </Link>
  );
}
