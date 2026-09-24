"use server";

import { revalidatePath } from "next/cache";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { requireSession } from "./require-auth";

export async function updateContractTemplate(patch: {
  body_en: string;
  body_ka: string;
  body_ru: string;
}): Promise<void> {
  await requireSession();
  const sb = gogaAdmin();
  const { error } = await sb
    .from("contract_templates")
    .update({
      body_en: patch.body_en,
      body_ka: patch.body_ka,
      body_ru: patch.body_ru,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/contract-template");
}
