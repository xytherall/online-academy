import { Skeleton } from "@/components/ui/skeleton";

export default function PublicLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-12 sm:px-6">
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-32 w-full" />
        ))}
      </div>
    </div>
  );
}
