// app/lib/goga/actions-meta.ts
"use server";
import { revalidatePath } from "next/cache";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { requireSession } from "./require-auth";
import { sendMessage } from "@/app/lib/meta";
import { addMessage, setHandoff, getThread } from "./meta-threads";
import type { MetaSettingsRow } from "@/app/lib/db/meta-types";

export async function saveMetaSettings(formData: FormData): Promise<void> {
  await requireSession();
  const patch: Partial<MetaSettingsRow> = {
    page_id: String(formData.get("page_id") ?? "").trim() || null,
    page_access_token:
      String(formData.get("page_access_token") ?? "").trim() || null,
    verify_token: String(formData.get("verify_token") ?? "").trim() || null,
    app_secret: String(formData.get("app_secret") ?? "").trim() || null,
    ig_user_id: String(formData.get("ig_user_id") ?? "").trim() || null,
    bot_enabled: formData.get("bot_enabled") === "on",
    updated_at: new Date().toISOString(),
  };
  await gogaAdmin()
    .from("meta_settings")
    .update(patch as MetaSettingsRow)
    .eq("id", 1);
  revalidatePath("/app/messages/settings");
}

export async function toggleHandoff(
  threadId: string,
  handoff: boolean,
): Promise<void> {
  await requireSession();
  await setHandoff(threadId, handoff);
  revalidatePath(`/app/messages/${threadId}`);
}

export async function sendManualReply(
  threadId: string,
  formData: FormData,
): Promise<void> {
  await requireSession();
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;
  const sb = gogaAdmin();
  const thread = await getThread(threadId);
  const { data: settings } = await sb
    .from("meta_settings")
    .select("page_access_token")
    .eq("id", 1)
    .maybeSingle();
  if (thread && settings?.page_access_token) {
    const sent = await sendMessage(
      settings.page_access_token,
      thread.external_id,
      text,
    );
    await addMessage(threadId, "out", "agent", text, sent.messageId);
  }
  revalidatePath(`/app/messages/${threadId}`);
}
