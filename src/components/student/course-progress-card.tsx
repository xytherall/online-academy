import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressRing } from "@/components/progress-ring";
import type { CourseReport } from "@/lib/progress-report";

export function CourseProgressCard({ report }: { report: CourseReport }) {
  const { course } = report;
  return (
    <Link href={`/student/courses/${course.id}`}>
      <Card className="h-full transition-colors hover:bg-accent/50">
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div className="space-y-1.5">
            <Badge variant="secondary">{course.level} Level</Badge>
            <CardTitle className="font-heading text-lg">{course.title}</CardTitle>
          </div>
          <div className="shrink-0 text-right">
            <ProgressRing pct={report.overallPct} size={56} />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {report.markedCount} of {report.totalCount} marked
            {report.missingCount > 0 ? ` · ${report.missingCount} missing` : ""}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
