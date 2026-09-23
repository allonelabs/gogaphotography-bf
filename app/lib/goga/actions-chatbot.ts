"use server";

import { revalidatePath } from "next/cache";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { logAdminEvent } from "./admin-events";
import { requireSession } from "./require-auth";

/**
 * Remove a website-chat transcript for good. The messages go with the
 * session — chatbot_messages.session_id is ON DELETE CASCADE. This is the
 * studio's way to honour a visitor's "please delete what I wrote" request,
 * and to clear out test chats.
 */
export async function deleteChatbotSession(id: string): Promise<void> {
  await requireSession();
  const { error } = await gogaAdmin()
    .from("chatbot_sessions")
    .delete()
    .eq("id", id);
  if (error) throw new Error(`deleteChatbotSession: ${error.message}`);
  await logAdminEvent("chatbot.session_deleted", {
    entityType: "chatbot_session",
    entityId: id,
  });
  revalidatePath("/admin/chatbot");
}
