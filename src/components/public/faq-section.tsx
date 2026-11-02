import Link from "next/link";
import { Accordion } from "@base-ui/react/accordion";
import { PlusIcon } from "lucide-react";
import { Eyebrow } from "@/components/eyebrow";
import { Reveal } from "@/components/public/reveal";
import type { PublicFaq } from "@/lib/faqs";

/**
 * Home-page FAQ section (before the closing CTA). Hidden entirely when there
 * are no published FAQs — never a placeholder/empty state here, since this
 * section simply shouldn't exist until the admin adds content (SPEC: no fake
 * content, empty content means a hidden section).
 */
export function FaqSection({ faqs }: { faqs: PublicFaq[] }) {
  if (faqs.length === 0) return null;

  return (
    <section className="border-t border-border px-4 py-[72px] sm:px-6 sm:py-[104px]">
      <Reveal className="mx-auto grid max-w-6xl items-start gap-10 lg:grid-cols-[1fr_1.5fr] lg:gap-12">
        <div className="space-y-3 lg:sticky lg:top-24">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="font-display text-[length:clamp(36px,4.8vw,60px)] leading-none font-extrabold tracking-[-0.04em]">
            Questions<em className="font-serif font-medium text-primary">?</em>
          </h2>
          <p className="max-w-sm leading-relaxed text-muted-foreground">
            Can&apos;t find your answer?{" "}
            <Link href="/contact" className="font-semibold text-primary hover:underline">
              Get in touch
            </Link>{" "}
            and we&apos;ll help.
          </p>
        </div>

        <Accordion.Root className="divide-y divide-border border-t border-b border-border">
          {faqs.map((faq) => (
            <Accordion.Item key={faq.id} value={faq.id}>
              <Accordion.Header>
                <Accordion.Trigger className="group flex min-h-16 w-full items-center justify-between gap-4 py-4 text-left text-lg font-semibold transition-colors hover:text-primary">
                  {faq.question}
                  <PlusIcon
                    aria-hidden
                    className="size-6 shrink-0 text-primary transition-transform duration-300 ease-out group-data-[panel-open]:rotate-45"
                  />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel className="overflow-hidden text-muted-foreground transition-[height] duration-200 ease-out data-[ending-style]:h-0 data-[starting-style]:h-0">
                <p className="pb-5 leading-relaxed whitespace-pre-line">{faq.answer}</p>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </Reveal>

      <script
        type="application/ld+json"
        // Structured data for Google (FAQPage). Built from the same published
        // rows rendered above — never separate/invented content.
        dangerouslySetInnerHTML={{
          // Escape "<" so a literal "</script>" in an answer can't break out
          // of this tag, even though the content is admin-authored only.
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: { "@type": "Answer", text: faq.answer },
            })),
          }).replace(/</g, "\\u003c"),
        }}
      />
    </section>
  );
}
