import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";

export default function AdminNotFound() {
  return (
    <EmptyState
      title="Not found"
      description="That page doesn't exist or may have been removed."
      action={
        <Button render={<Link href="/admin" />} nativeButton={false}>
          Back to dashboard
        </Button>
      }
    />
  );
}
