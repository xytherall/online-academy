import type { Metadata } from "next";
import { PageHeader } from "@/components/public/page-header";
import { buildWhatsAppUrl, FALLBACK_SITE_LABEL } from "@/lib/settings";
import { getSiteSettings } from "@/lib/get-site-settings";
import { buildPageMetadata } from "@/lib/page-metadata";

const LAST_UPDATED = "2 October 2026";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const academyName = settings?.academy_name?.trim() || FALLBACK_SITE_LABEL;
  return buildPageMetadata({
    path: "/privacy",
    title: `Privacy Policy | ${academyName}`,
    description: `How ${academyName} collects, uses and protects your information.`,
  });
}

export default async function PrivacyPage() {
  const settings = await getSiteSettings();
  const academyName = settings?.academy_name?.trim() || FALLBACK_SITE_LABEL;
  const whatsappUrl = settings?.contact_whatsapp ? buildWhatsAppUrl(settings.contact_whatsapp) : null;
  const email = settings?.contact_email?.trim();

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader eyebrow="Legal" title="Privacy Policy" />
      <div className="mx-auto w-full max-w-2xl flex-1 space-y-8 px-4 pb-[72px] sm:px-6 sm:pb-[104px]">
        <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>

        <Section title="What this policy covers">
          <p>
            This policy explains how {academyName} collects, uses and stores information through our
            website and student portal — when you apply, when you&rsquo;re an enrolled student, and
            when you visit our public pages.
          </p>
        </Section>

        <Section title="What we collect">
          <p>When you fill in the application form, we collect:</p>
          <List
            items={[
              "Your full name, email address, phone number and WhatsApp number",
              "Your country and, if you give it, your current school",
              "The level (O Level / A Level) and subjects you're applying for",
              "A parent or guardian's name, phone number and email, if you provide one",
              "How you heard about us, if you tell us",
            ]}
          />
          <p>Once you&rsquo;re enrolled as a student, we also hold:</p>
          <List
            items={[
              "The courses and batch you're assigned to",
              "Assignment and test files you upload, and the marks and feedback your teachers give you",
              "Your overall progress report, built from that marked work",
              "Login details for the student portal",
            ]}
          />
          <p>
            We don&rsquo;t ask for anything beyond this, and we don&rsquo;t collect payment details —
            we don&rsquo;t currently handle any payments online.
          </p>
        </Section>

        <Section title="Why we collect it">
          <List
            items={[
              "To review your application and decide whether to offer you a place",
              "To run your classes: assigning you to a batch, sharing resources, setting and marking work",
              "To build your progress report, which a parent or guardian can also see",
              "To contact you or your guardian about your application, classes or account",
            ]}
          />
          <p>We don&rsquo;t use your information for advertising, and we never sell it.</p>
        </Section>

        <Section title="Who can see it">
          <p>
            Your information is visible only to you and to {academyName} staff who need it to teach
            and support you (for example, marking your work). It is never shared with other students,
            and never sold, rented or shared with anyone for marketing purposes.
          </p>
        </Section>

        <Section title="How it's stored">
          <p>
            Our website, student portal and database are built on{" "}
            <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
              Supabase
            </a>
            , and the site itself is hosted on{" "}
            <a href="https://www.netlify.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
              Netlify
            </a>
            . Uploaded files (like assignments) are kept in private storage and are only ever
            accessible through short-lived, signed links — never a public URL.
          </p>
        </Section>

        <Section title="How long we keep it">
          <p>
            We keep your information for as long as you&rsquo;re enrolled, so your records and
            progress report stay available to you and your guardian. If your application isn&rsquo;t
            accepted, or after you leave the academy, we keep records for a reasonable period in case
            you reapply or need a reference, and then remove what we no longer need.
          </p>
        </Section>

        <Section title="Your choices">
          <p>
            You can ask us to correct any information we hold about you, or to delete your account
            and data, at any time. The quickest way is to message us on WhatsApp
            {whatsappUrl ? (
              <>
                {" "}
                at{" "}
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                  our WhatsApp number
                </a>
              </>
            ) : (
              " using the number on our Contact page"
            )}
            {email ? (
              <>
                {" "}
                or by emailing{" "}
                <a href={`mailto:${email}`} className="underline hover:text-foreground">
                  {email}
                </a>
              </>
            ) : null}
            .
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            If we change how we handle your information, we&rsquo;ll update this page and the
            &ldquo;last updated&rdquo; date above.
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-heading text-xl">{title}</h2>
      <div className="space-y-3 text-muted-foreground">{children}</div>
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
