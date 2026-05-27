"use server";

import { revalidatePath } from "next/cache";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { requireSession } from "./require-auth";
import { logAdminEvent } from "./admin-events";

export interface StudioInfoForm {
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  address_locality?: string | null;
  address_country?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  pinterest_url?: string | null;
  tiktok_url?: string | null;
  hours?: string | null;
}

function clean(s: FormDataEntryValue | null): string | null {
  if (typeof s !== "string") return null;
  const t = s.trim();
  return t === "" ? null : t;
}

/**
 * Upsert the studio_info singleton (id=1). Pure text edits; for the
 * hero/portrait images we already have actions-media.uploadSurfaceImage.
 */
export async function updateStudioInfo(formData: FormData): Promise<void> {
  await requireSession();
  const sb = gogaAdmin();
  const patch: StudioInfoForm = {
    email: clean(formData.get("email")),
    phone: clean(formData.get("phone")),
    whatsapp: clean(formData.get("whatsapp")),
    address_locality: clean(formData.get("address_locality")),
    address_country: clean(formData.get("address_country")),
    instagram_url: clean(formData.get("instagram_url")),
    facebook_url: clean(formData.get("facebook_url")),
    pinterest_url: clean(formData.get("pinterest_url")),
    tiktok_url: clean(formData.get("tiktok_url")),
    hours: clean(formData.get("hours")),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (sb as any)
    .from("studio_info")
    .upsert({ id: 1, ...patch, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  await logAdminEvent("hero.updated", {
    entityType: "studio_info",
    entityId: "singleton",
    payload: {
      fields: Object.keys(patch).filter(
        (k) => patch[k as keyof StudioInfoForm] != null,
      ),
    },
  });
  revalidatePath("/app/studio");
}
