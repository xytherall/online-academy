import { Skeleton } from "@/components/ui/skeleton";

export default function StudentDetailLoading() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-9 w-64" />
      <div className="max-w-xl space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
      <Skeleton className="h-px w-full" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}
