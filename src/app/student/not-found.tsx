import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";

export default function StudentNotFound() {
  return (
    <EmptyState
      title="Not found"
      description="That page doesn't exist or may have been removed."
      action={
        <Button render={<Link href="/student" />} nativeButton={false}>
          Back to dashboard
        </Button>
      }
    />
  );
}
