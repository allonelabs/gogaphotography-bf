"use server";

import { revalidatePath } from "next/cache";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { requireSession } from "./require-auth";

export async function updateImageCaption(
  imageId: string,
  patch: {
    caption?: string | null;
    caption_ka?: string | null;
    caption_ru?: string | null;
    alt_text?: string | null;
  },
): Promise<void> {
  await requireSession();
  const sb = gogaAdmin();
  const { error } = await sb
    .from("project_images")
    .update(patch)
    .eq("id", imageId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/photo-captions");
}
