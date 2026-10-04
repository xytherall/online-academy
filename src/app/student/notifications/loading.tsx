import { Skeleton } from "@/components/ui/skeleton";

export default function StudentNotificationsLoading() {
  return (
    <div className="max-w-2xl space-y-6">
      <Skeleton className="h-7 w-40" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}
