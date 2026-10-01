"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { displayName } from "@/lib/display-name";
import { activeStatusBadgeVariant } from "@/lib/status-badge";

export type StudentRow = {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  country: string | null;
  is_active: boolean;
  batch: { id: string; name: string } | null;
  course_ids: string[];
};

const ALL = "__all__";

export function StudentsTable({
  students,
  batches,
  courses,
}: {
  students: StudentRow[];
  batches: { id: string; name: string }[];
  courses: { id: string; title: string }[];
}) {
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState(ALL);
  const [courseFilter, setCourseFilter] = useState(ALL);
  const [countryFilter, setCountryFilter] = useState(ALL);
  const [activeFilter, setActiveFilter] = useState(ALL);

  const countries = useMemo(() => {
    const set = new Set<string>();
    for (const student of students) if (student.country) set.add(student.country);
    return Array.from(set).sort();
  }, [students]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return students.filter((student) => {
      if (query) {
        const haystack = `${student.full_name ?? ""} ${student.email} ${student.phone ?? ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (batchFilter !== ALL) {
        if (batchFilter === "__none__" ? student.batch !== null : student.batch?.id !== batchFilter) return false;
      }
      if (courseFilter !== ALL && !student.course_ids.includes(courseFilter)) return false;
      if (countryFilter !== ALL && student.country !== countryFilter) return false;
      if (activeFilter !== ALL) {
        const wantActive = activeFilter === "active";
        if (student.is_active !== wantActive) return false;
      }
      return true;
    });
  }, [students, search, batchFilter, courseFilter, countryFilter, activeFilter]);

  if (students.length === 0) {
    return (
      <EmptyState
        title="No students yet"
        description="Add your first student to get started."
        action={
          <Button render={<Link href="/admin/students/new" />} nativeButton={false} className="mt-2">
            Add student
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search name, email or phone"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="max-w-xs"
        />

        <Select
          items={{ [ALL]: "All batches", __none__: "No batch", ...Object.fromEntries(batches.map((b) => [b.id, b.name])) }}
          value={batchFilter}
          onValueChange={(value) => setBatchFilter(value ?? ALL)}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All batches</SelectItem>
            <SelectItem value="__none__">No batch</SelectItem>
            {batches.map((batch) => (
              <SelectItem key={batch.id} value={batch.id}>{batch.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          items={{ [ALL]: "All courses", ...Object.fromEntries(courses.map((c) => [c.id, c.title])) }}
          value={courseFilter}
          onValueChange={(value) => setCourseFilter(value ?? ALL)}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All courses</SelectItem>
            {courses.map((course) => (
              <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          items={{ [ALL]: "All countries", ...Object.fromEntries(countries.map((c) => [c, c])) }}
          value={countryFilter}
          onValueChange={(value) => setCountryFilter(value ?? ALL)}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All countries</SelectItem>
            {countries.map((country) => (
              <SelectItem key={country} value={country}>{country}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          items={{ [ALL]: "All statuses", active: "Active", inactive: "Deactivated" }}
          value={activeFilter}
          onValueChange={(value) => setActiveFilter(value ?? ALL)}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Deactivated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No matching students" description="Try adjusting your search or filters." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Email</TableHead>
              <TableHead className="hidden md:table-cell">Batch</TableHead>
              <TableHead className="hidden md:table-cell">Country</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((student) => (
              <TableRow key={student.id}>
                <TableCell>
                  <Link href={`/admin/students/${student.id}`} className="font-medium hover:underline">
                    {displayName(student)}
                  </Link>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{student.email}</TableCell>
                <TableCell className="hidden md:table-cell">{student.batch?.name ?? "—"}</TableCell>
                <TableCell className="hidden md:table-cell">{student.country ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={activeStatusBadgeVariant(student.is_active)}>
                    {student.is_active ? "Active" : "Deactivated"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" render={<Link href={`/admin/students/${student.id}`} />} nativeButton={false}>
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
