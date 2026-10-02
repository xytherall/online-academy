import { Accordion } from "@base-ui/react/accordion";
import { ChevronDownIcon } from "lucide-react";
import { Eyebrow } from "@/components/eyebrow";
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
      <div className="mx-auto max-w-3xl">
        <div className="mb-12 max-w-xl space-y-3">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="text-[length:clamp(32px,4.4vw,52px)] leading-[1.06]">Frequently asked questions</h2>
        </div>

        <Accordion.Root className="divide-y divide-border border-t border-b border-border">
          {faqs.map((faq) => (
            <Accordion.Item key={faq.id} value={faq.id} className="py-1">
              <Accordion.Header>
                <Accordion.Trigger className="group flex w-full items-center justify-between gap-4 py-4 text-left font-medium transition-colors hover:text-primary">
                  {faq.question}
                  <ChevronDownIcon
                    aria-hidden
                    className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 ease-out group-data-[panel-open]:rotate-180"
                  />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel className="overflow-hidden text-sm text-muted-foreground transition-[height] duration-200 ease-out data-[starting-style]:h-0 data-[ending-style]:h-0">
                <p className="pb-4 whitespace-pre-line">{faq.answer}</p>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>

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
