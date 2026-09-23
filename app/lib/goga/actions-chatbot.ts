"use server";

import { revalidatePath } from "next/cache";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { logAdminEvent } from "./admin-events";
import { requireSession } from "./require-auth";

/**
 * Remove a website-chat transcript for good — messages first, then the
 * session, so a foreign key without ON DELETE CASCADE cannot leave the
 * messages orphaned. This is the studio's way to honour a visitor's
 * "please delete what I wrote" request, and to clear out test chats.
 */
export async function deleteChatbotSession(id: string): Promise<void> {
  await requireSession();
  const sb = gogaAdmin();
  const { error: msgErr } = await sb
    .from("chatbot_messages")
    .delete()
    .eq("session_id", id);
  if (msgErr) throw new Error(`deleteChatbotSession: ${msgErr.message}`);
  const { error } = await sb.from("chatbot_sessions").delete().eq("id", id);
  if (error) throw new Error(`deleteChatbotSession: ${error.message}`);
  await logAdminEvent("chatbot.session_deleted", {
    entityType: "chatbot_session",
    entityId: id,
  });
  revalidatePath("/admin/chatbot");
}
