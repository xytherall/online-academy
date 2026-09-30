"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/admin/empty-state";
import { LocalDateTime } from "@/components/local-date-time";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { COURSE_LEVEL_LABELS } from "@/lib/group-courses";
import type { Database } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

type ApplicationStatus = Database["public"]["Enums"]["application_status"];

export type ApplicationRow = {
  id: string;
  full_name: string;
  email: string;
  country: string;
  level: "O" | "A";
  status: ApplicationStatus;
  course_count: number;
  created_at: string;
};

const TABS: { status: ApplicationStatus; label: string }[] = [
  { status: "pending", label: "Pending" },
  { status: "accepted", label: "Accepted" },
  { status: "rejected", label: "Rejected" },
];

const EMPTY_TAB_DESCRIPTION: Record<ApplicationStatus, string> = {
  pending: "Everything has been reviewed. New applications will appear here.",
  accepted: "Applications you accept will be listed here.",
  rejected: "Applications you reject will be listed here.",
};

/**
 * Filtering is client-side over the already-fetched rows, like the students
 * list: an applicant's name or email must never end up in the URL (SPEC
 * security rules — no personal data in query strings).
 */
export function ApplicationsTable({ applications }: { applications: ApplicationRow[] }) {
  const [activeStatus, setActiveStatus] = useState<ApplicationStatus>("pending");

  const counts = useMemo(() => {
    const result: Record<ApplicationStatus, number> = { pending: 0, accepted: 0, rejected: 0 };
    for (const application of applications) result[application.status] += 1;
    return result;
  }, [applications]);

  const visible = useMemo(
    () => applications.filter((application) => application.status === activeStatus),
    [applications, activeStatus],
  );

  if (applications.length === 0) {
    return (
      <EmptyState
        title="No applications yet"
        description="Applications sent from the public Apply form will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* No Tabs primitive in this project, so this is a plain segmented control. */}
      <div role="tablist" aria-label="Application status" className="flex flex-wrap gap-1">
        {TABS.map((tab) => {
          const isActive = tab.status === activeStatus;
          return (
            <button
              key={tab.status}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveStatus(tab.status)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50",
              )}
            >
              {tab.label}
              <span className="ml-1.5 text-xs text-muted-foreground">{counts[tab.status]}</span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={`No ${activeStatus} applications`}
          description={EMPTY_TAB_DESCRIPTION[activeStatus]}
        />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead>Level</TableHead>
                <TableHead className="hidden md:table-cell">Courses</TableHead>
                <TableHead className="hidden lg:table-cell">Country</TableHead>
                <TableHead className="hidden sm:table-cell">Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((application) => (
                <TableRow key={application.id}>
                  <TableCell>
                    <Link
                      href={`/admin/applications/${application.id}`}
                      className="font-medium hover:underline"
                    >
                      {application.full_name}
                    </Link>
                    <span className="block text-xs text-muted-foreground sm:hidden">
                      {application.email}
                    </span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{application.email}</TableCell>
                  <TableCell>{COURSE_LEVEL_LABELS[application.level]}</TableCell>
                  <TableCell className="hidden md:table-cell">{application.course_count}</TableCell>
                  <TableCell className="hidden lg:table-cell">{application.country}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <LocalDateTime iso={application.created_at} className="text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
