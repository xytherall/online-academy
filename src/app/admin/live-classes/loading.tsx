import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLiveClassesLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-48" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}
