"use client";

import { useActionState, useEffect, useState } from "react";
import type { z } from "zod";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SiteSettings } from "@/lib/settings";
import { settingsSchema } from "@/lib/validation/settings";
import { updateSettings, type SettingsState } from "./actions";

const initialState: SettingsState = { error: null, success: false };

function readSocialLinks(settings: SiteSettings | null) {
  const raw = (settings?.social_links ?? {}) as Record<string, unknown>;
  const read = (key: string) => (typeof raw[key] === "string" ? (raw[key] as string) : "");
  return {
    facebook: read("facebook"),
    instagram: read("instagram"),
    youtube: read("youtube"),
    tiktok: read("tiktok"),
    linkedin: read("linkedin"),
    x: read("x"),
  };
}

function buildFieldErrors(error: z.ZodError): Record<string, string> {
  const map: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!(key in map)) map[key] = issue.message;
  }
  return map;
}

function parseFormValues(formData: FormData) {
  return {
    academy_name: formData.get("academy_name"),
    tagline: formData.get("tagline"),
    about_text: formData.get("about_text"),
    contact_email: formData.get("contact_email"),
    contact_phone: formData.get("contact_phone"),
    contact_whatsapp: formData.get("contact_whatsapp"),
    address: formData.get("address"),
    social_links: {
      facebook: formData.get("social_facebook"),
      instagram: formData.get("social_instagram"),
      youtube: formData.get("social_youtube"),
      tiktok: formData.get("social_tiktok"),
      linkedin: formData.get("social_linkedin"),
      x: formData.get("social_x"),
    },
  };
}

export function SettingsForm({ settings }: { settings: SiteSettings | null }) {
  const [state, formAction, isPending] = useActionState(updateSettings, initialState);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const social = readSocialLinks(settings);

  useEffect(() => {
    if (state.success) toast.success("Saved");
  }, [state]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const parsed = settingsSchema.safeParse(parseFormValues(new FormData(event.currentTarget)));

    if (parsed.success) {
      setFieldErrors({});
      return;
    }

    event.preventDefault();
    setFieldErrors(buildFieldErrors(parsed.error));
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-8" noValidate>
      <section className="space-y-4">
        <h2 className="font-medium">Academy</h2>
        <Field id="academy_name" label="Academy name" defaultValue={settings?.academy_name ?? ""} error={fieldErrors.academy_name} />
        <Field id="tagline" label="Tagline" defaultValue={settings?.tagline ?? ""} error={fieldErrors.tagline} />
        <div className="space-y-2">
          <Label htmlFor="about_text">About</Label>
          <Textarea
            id="about_text"
            name="about_text"
            rows={6}
            defaultValue={settings?.about_text ?? ""}
            aria-invalid={Boolean(fieldErrors.about_text)}
          />
          {fieldErrors.about_text ? <FieldError>{fieldErrors.about_text}</FieldError> : null}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-medium">Contact</h2>
        <Field
          id="contact_email"
          label="Contact email"
          type="email"
          defaultValue={settings?.contact_email ?? ""}
          error={fieldErrors.contact_email}
        />
        <Field id="contact_phone" label="Phone" defaultValue={settings?.contact_phone ?? ""} error={fieldErrors.contact_phone} />
        <Field
          id="contact_whatsapp"
          label="WhatsApp"
          defaultValue={settings?.contact_whatsapp ?? ""}
          error={fieldErrors.contact_whatsapp}
        />
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Textarea
            id="address"
            name="address"
            rows={3}
            defaultValue={settings?.address ?? ""}
            aria-invalid={Boolean(fieldErrors.address)}
          />
          {fieldErrors.address ? <FieldError>{fieldErrors.address}</FieldError> : null}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-medium">Social links</h2>
        <Field id="social_facebook" label="Facebook" defaultValue={social.facebook} error={fieldErrors["social_links.facebook"]} />
        <Field id="social_instagram" label="Instagram" defaultValue={social.instagram} error={fieldErrors["social_links.instagram"]} />
        <Field id="social_youtube" label="YouTube" defaultValue={social.youtube} error={fieldErrors["social_links.youtube"]} />
        <Field id="social_tiktok" label="TikTok" defaultValue={social.tiktok} error={fieldErrors["social_links.tiktok"]} />
        <Field id="social_linkedin" label="LinkedIn" defaultValue={social.linkedin} error={fieldErrors["social_links.linkedin"]} />
        <Field id="social_x" label="X (Twitter)" defaultValue={social.x} error={fieldErrors["social_links.x"]} />
      </section>

      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription role="alert">{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}

function Field({
  id,
  label,
  defaultValue,
  error,
  type = "text",
}: {
  id: string;
  label: string;
  defaultValue: string;
  error?: string;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} type={type} defaultValue={defaultValue} aria-invalid={Boolean(error)} />
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-destructive">{children}</p>;
}
