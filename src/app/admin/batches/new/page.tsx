import type { Metadata } from "next";
import { BatchForm } from "../batch-form";

export const metadata: Metadata = { title: "New batch" };

export default function NewBatchPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold tracking-[-0.02em] sm:text-3xl">New batch</h1>
      <BatchForm mode="create" />
    </div>
  );
}
