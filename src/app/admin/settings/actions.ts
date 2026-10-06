"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import { logoPathSchema, settingsSchema } from "@/lib/validation/settings";

export type SettingsState = { error: string | null; success: boolean };

function revalidateSettingsPaths() {
  revalidatePath("/", "layout");
  revalidatePath("/admin");
  revalidatePath("/admin/settings");
}

export async function updateSettings(
  _prevState: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  await requireAdmin();

  const parsed = settingsSchema.safeParse({
    academy_name: formData.get("academy_name"),
    tagline: formData.get("tagline"),
    about_text: formData.get("about_text"),
    about_page_text: formData.get("about_page_text"),
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
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Please check the form and try again.",
      success: false,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("site_settings")
    .update({
      academy_name: parsed.data.academy_name,
      tagline: parsed.data.tagline,
      about_text: parsed.data.about_text,
      about_page_text: parsed.data.about_page_text,
      contact_email: parsed.data.contact_email,
      contact_phone: parsed.data.contact_phone,
      contact_whatsapp: parsed.data.contact_whatsapp,
      address: parsed.data.address,
      social_links: parsed.data.social_links as Json,
    })
    .eq("id", 1);

  if (error) return { error: "Could not save settings. Please try again.", success: false };

  revalidateSettingsPaths();
  return { error: null, success: true };
}

export async function updateLogo(rawPath: string): Promise<{ error: string | null }> {
  await requireAdmin();

  const parsed = logoPathSchema.safeParse(rawPath);
  if (!parsed.success) return { error: "Invalid file." };
  const newPath = parsed.data;

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("site_settings")
    .select("logo_path")
    .eq("id", 1)
    .maybeSingle();

  const { error } = await supabase.from("site_settings").update({ logo_path: newPath }).eq("id", 1);
  if (error) return { error: "Could not save the logo. Please try again." };

  if (current?.logo_path && current.logo_path !== newPath) {
    await supabase.storage.from("public-assets").remove([current.logo_path]);
  }

  revalidateSettingsPaths();
  return { error: null };
}

export async function removeLogo(): Promise<{ error: string | null }> {
  await requireAdmin();

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("site_settings")
    .select("logo_path")
    .eq("id", 1)
    .maybeSingle();

  if (!current?.logo_path) return { error: null };

  const { error } = await supabase.from("site_settings").update({ logo_path: null }).eq("id", 1);
  if (error) return { error: "Could not remove the logo. Please try again." };

  await supabase.storage.from("public-assets").remove([current.logo_path]);

  revalidateSettingsPaths();
  return { error: null };
}
