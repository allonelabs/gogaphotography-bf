// app/lib/goga/actions-portfolio.ts
"use server";
import { revalidatePath } from "next/cache";
import { requireSession } from "./require-auth";
import { updateAlbum } from "./portfolio-albums";

export async function saveAlbum(id: string, formData: FormData): Promise<void> {
  await requireSession();
  await updateAlbum(id, {
    name_en: String(formData.get("name_en") ?? "").trim(),
    name_ka: String(formData.get("name_ka") ?? "").trim(),
    sort_order: parseInt(String(formData.get("sort_order") ?? "0"), 10) || 0,
  });
  revalidatePath("/app/projects/albums");
}
