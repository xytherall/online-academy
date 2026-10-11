import { Skeleton } from "@/components/ui/skeleton";

export default function StudentLectureLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="aspect-video w-full" />
      <Skeleton className="h-7 w-64" />
    </div>
  );
}
