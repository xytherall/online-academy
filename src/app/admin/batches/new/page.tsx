import { BatchForm } from "../batch-form";

export default function NewBatchPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">New batch</h1>
      <BatchForm mode="create" />
    </div>
  );
}
