import { Skeleton } from "@/components/ui/skeleton";

export default function EditBatchLoading() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-7 w-48" />
      <div className="max-w-xl space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-px w-full" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
