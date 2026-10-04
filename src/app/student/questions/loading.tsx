import { Skeleton } from "@/components/ui/skeleton";

export default function StudentQuestionsLoading() {
  return (
    <div className="max-w-2xl space-y-8">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-64 w-full" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full" />
        ))}
      </div>
    </div>
  );
}
