"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";

export default function StudentError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <EmptyState
      title="Something went wrong"
      description="We couldn't load this page. Please try again."
      action={<Button onClick={retry}>Try again</Button>}
    />
  );
}
