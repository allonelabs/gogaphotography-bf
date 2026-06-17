// app/lib/goga/meta-logic.ts
import type {
  MetaChannel,
  MetaThreadRow,
  MetaSettingsRow,
} from "@/app/lib/db/meta-types";

export interface ParsedEvent {
  channel: MetaChannel;
  senderId: string;
  text: string;
  mid: string;
}

export function parseWebhookEvents(body: unknown): ParsedEvent[] {
  const b = body as {
    object?: string;
    entry?: Array<{ messaging?: unknown[] }>;
  };
  const channel: MetaChannel | null =
    b.object === "page"
      ? "messenger"
      : b.object === "instagram"
        ? "instagram"
        : null;
  if (!channel || !Array.isArray(b.entry)) return [];
  const out: ParsedEvent[] = [];
  for (const entry of b.entry) {
    const msgs = Array.isArray(entry.messaging) ? entry.messaging : [];
    for (const m of msgs) {
      const ev = m as {
        sender?: { id?: string };
        message?: { mid?: string; text?: string; is_echo?: boolean };
        delivery?: unknown;
        read?: unknown;
      };
      const senderId = ev.sender?.id;
      const text = ev.message?.text;
      if (!senderId || !ev.message || ev.message.is_echo || !text) continue;
      out.push({ channel, senderId, text, mid: ev.message.mid ?? "" });
    }
  }
  return out;
}

export function shouldAutoReply(
  thread: Pick<MetaThreadRow, "handoff">,
  settings: Pick<MetaSettingsRow, "bot_enabled">,
): boolean {
  return !!settings.bot_enabled && !thread.handoff;
}
