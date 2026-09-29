import { Skeleton } from "@/components/ui/skeleton";

export default function EditCourseLoading() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-7 w-56" />
      <div className="max-w-xl space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
