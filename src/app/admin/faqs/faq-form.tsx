"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Tables } from "@/lib/supabase/database.types";
import { faqSchema } from "@/lib/validation/faqs";
import { createFaq, updateFaq, type FaqFormState } from "./actions";

const initialState: FaqFormState = { error: null, success: false };

type Faq = Tables<"faqs">;

export function FaqForm(
  props: { mode: "create"; onDone: () => void } | { mode: "edit"; faq: Faq; onDone: () => void },
) {
  const faq = props.mode === "edit" ? props.faq : undefined;
  const action = props.mode === "create" ? createFaq : updateFaq.bind(null, props.faq.id);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const router = useRouter();

  const [question, setQuestion] = useState(faq?.question ?? "");
  const [answer, setAnswer] = useState(faq?.answer ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (state.success) {
      toast.success("Saved");
      props.onDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const parsed = faqSchema.safeParse({
      question: formData.get("question"),
      answer: formData.get("answer"),
    });

    if (!parsed.success) {
      event.preventDefault();
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".");
        if (!(key in map)) map[key] = issue.message;
      }
      setFieldErrors(map);
      return;
    }
    setFieldErrors({});
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="faq-question">Question</Label>
        <Input
          id="faq-question"
          name="question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          aria-invalid={Boolean(fieldErrors.question)}
        />
        {fieldErrors.question ? <FieldError>{fieldErrors.question}</FieldError> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="faq-answer">Answer</Label>
        <Textarea
          id="faq-answer"
          name="answer"
          rows={6}
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          aria-invalid={Boolean(fieldErrors.answer)}
        />
        {fieldErrors.answer ? <FieldError>{fieldErrors.answer}</FieldError> : null}
      </div>

      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            props.onDone();
            router.refresh();
          }}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : props.mode === "create" ? "Add FAQ" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-destructive">{children}</p>;
}
