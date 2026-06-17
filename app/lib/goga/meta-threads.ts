// app/lib/goga/meta-threads.ts
import "server-only";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import type {
  MetaChannel,
  MetaThreadRow,
  MetaMessageRow,
  MetaSender,
  MetaDirection,
} from "@/app/lib/db/meta-types";

export async function upsertThread(
  channel: MetaChannel,
  externalId: string,
): Promise<MetaThreadRow> {
  const sb = gogaAdmin();
  const { data: existing } = await sb
    .from("meta_threads")
    .select("*")
    .eq("channel", channel)
    .eq("external_id", externalId)
    .maybeSingle();
  if (existing) return existing as MetaThreadRow;
  const { data, error } = await sb
    .from("meta_threads")
    .insert({ channel, external_id: externalId })
    .select("*")
    .single();
  if (error || !data) throw new Error(`upsertThread: ${error?.message}`);
  return data as MetaThreadRow;
}

export async function addMessage(
  threadId: string,
  direction: MetaDirection,
  sender: MetaSender,
  text: string,
  metaMessageId?: string,
): Promise<void> {
  const sb = gogaAdmin();
  await sb.from("meta_messages").insert({
    thread_id: threadId,
    direction,
    sender,
    text,
    meta_message_id: metaMessageId ?? null,
  });
  await sb
    .from("meta_threads")
    .update({ last_message_at: new Date().toISOString() } as MetaThreadRow)
    .eq("id", threadId);
}

export async function recentHistory(
  threadId: string,
  limit = 10,
): Promise<MetaMessageRow[]> {
  const { data } = await gogaAdmin()
    .from("meta_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as MetaMessageRow[]).reverse();
}

export async function setHandoff(
  threadId: string,
  handoff: boolean,
): Promise<void> {
  await gogaAdmin()
    .from("meta_threads")
    .update({ handoff } as MetaThreadRow)
    .eq("id", threadId);
}

export async function listThreads(): Promise<MetaThreadRow[]> {
  const { data } = await gogaAdmin()
    .from("meta_threads")
    .select("*")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(200);
  return (data ?? []) as MetaThreadRow[];
}

export async function getThread(id: string): Promise<MetaThreadRow | null> {
  const { data } = await gogaAdmin()
    .from("meta_threads")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as MetaThreadRow) ?? null;
}

export async function threadMessages(
  threadId: string,
): Promise<MetaMessageRow[]> {
  const { data } = await gogaAdmin()
    .from("meta_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  return (data ?? []) as MetaMessageRow[];
}
