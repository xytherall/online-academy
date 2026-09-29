import { Skeleton } from "@/components/ui/skeleton";

export default function StudentAccountLoading() {
  return (
    <div className="max-w-xl space-y-8">
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
