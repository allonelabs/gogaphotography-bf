"use server";

import { revalidatePath } from "next/cache";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { requireSession } from "./require-auth";

export async function updateSiteSettings(patch: {
  page_transitions: boolean;
  reveal_animations: boolean;
  caption_mode: "cursor" | "bottom" | "off";
  lightbox_captions: boolean;
  calculator_enabled: boolean;
}): Promise<void> {
  await requireSession();
  const sb = gogaAdmin();
  const { error } = await sb
    .from("site_settings")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/site-settings");
}
