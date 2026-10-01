import type { Metadata } from "next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/server";
import { FaqManager } from "./faq-manager";

export const metadata: Metadata = { title: "FAQ" };

export default async function AdminFaqsPage() {
  const supabase = await createClient();
  const { data: faqs, error } = await supabase
    .from("faqs")
    .select("*")
    .order("sort_order")
    .order("created_at");

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Could not load the FAQ list. Please refresh the page.</AlertDescription>
      </Alert>
    );
  }

  return <FaqManager faqs={faqs ?? []} />;
}
