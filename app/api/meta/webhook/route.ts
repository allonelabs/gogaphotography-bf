// app/api/meta/webhook/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { verifyWebhook, validateSignature, sendMessage } from "@/app/lib/meta";
import { parseWebhookEvents, shouldAutoReply } from "@/app/lib/goga/meta-logic";
import { runBot, type BotContext } from "@/app/lib/goga/meta-bot";
import {
  upsertThread,
  addMessage,
  recentHistory,
  setHandoff,
} from "@/app/lib/goga/meta-threads";
import { logAdminEvent } from "@/app/lib/goga/admin-events";
import type { ChatMessage } from "@/app/lib/llm-fallback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const sb = gogaAdmin();
  const { data: settings } = await sb
    .from("meta_settings")
    .select("verify_token")
    .eq("id", 1)
    .maybeSingle();
  const challenge = verifyWebhook(
    sp.get("hub.mode"),
    sp.get("hub.verify_token"),
    sp.get("hub.challenge"),
    settings?.verify_token ?? null,
  );
  if (challenge === null) return new NextResponse("forbidden", { status: 403 });
  return new NextResponse(challenge, {
    status: 200,
    headers: { "content-type": "text/plain" },
  });
}

async function loadContext(
  sb: ReturnType<typeof gogaAdmin>,
): Promise<BotContext> {
  const [si, services, packages] = await Promise.all([
    // studio_info is not in the typed GogaDatabase — access loosely.
    (
      sb as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            eq: (
              k: string,
              v: number,
            ) => { maybeSingle: () => Promise<{ data: unknown }> };
          };
        };
      }
    )
      .from("studio_info")
      .select("*")
      .eq("id", 1)
      .maybeSingle(),
    sb.from("services").select("title_en,title_ka").eq("published", true),
    sb
      .from("packages")
      .select("name_en,name_ka,base_price_cents,currency")
      .eq("published", true),
  ]);
  return {
    studioInfo: (si.data as BotContext["studioInfo"]) ?? null,
    services: (services.data ?? []) as BotContext["services"],
    packages: (packages.data ?? []) as BotContext["packages"],
  };
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sb = gogaAdmin();
  const { data: settings } = await sb
    .from("meta_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (!settings) return NextResponse.json({ ok: true });

  if (settings.app_secret) {
    const ok = validateSignature(
      settings.app_secret,
      raw,
      req.headers.get("x-hub-signature-256"),
    );
    if (!ok)
      return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  let body: unknown = null;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: true });
  }
  const events = parseWebhookEvents(body);

  for (const ev of events) {
    try {
      const thread = await upsertThread(ev.channel, ev.senderId);
      await addMessage(thread.id, "in", "user", ev.text, ev.mid);
      if (!shouldAutoReply(thread, settings)) continue;

      const ctx = await loadContext(sb);
      const history: ChatMessage[] = (await recentHistory(thread.id, 10)).map(
        (m) => ({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.text,
        }),
      );
      const result = await runBot(history.slice(0, -1), ev.text, ctx);

      if (result.lead) {
        await sb.from("leads").insert(result.lead as never);
        await logAdminEvent("lead.created", {
          entityType: "lead",
          payload: { source: "meta", channel: ev.channel },
          actor: "meta-bot",
        });
      }
      if (result.escalate) await setHandoff(thread.id, true);

      if (settings.page_access_token) {
        const sent = await sendMessage(
          settings.page_access_token,
          ev.senderId,
          result.reply,
        );
        await addMessage(thread.id, "out", "bot", result.reply, sent.messageId);
      }
    } catch (e) {
      console.error("[meta/webhook] event failed", e);
    }
  }
  return NextResponse.json({ ok: true });
}
