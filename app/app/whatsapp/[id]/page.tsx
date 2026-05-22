/**
 * WhatsApp single-thread conversation.
 *
 * Server component. Loads the thread + the last 200 messages ascending,
 * renders the message list (server) and mounts a client composer at the
 * bottom. Outbound messages are right-aligned with an accent tint;
 * inbound are left-aligned with surface-alt tint. Status glyph
 * (queued/sent/delivered/read/failed) appears next to each outbound
 * timestamp.
 *
 * Permission: `whatsapp.read` is required to open the page; the composer
 * is hidden if the user lacks `whatsapp.send`.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/app/components/app/AppShell";
import { createOrgScopedSupabaseClient } from "@/app/lib/supabase/with-org";
import {
  requirePermission,
  userHasPermission,
} from "@/app/lib/auth/permissions";
import { getServerT } from "@/app/lib/i18n/server";
import { ArrowLeft } from "lucide-react";
import { AutoScrollAnchor, Composer, StatusGlyph } from "./_conversation";

export const dynamic = "force-dynamic";

interface ThreadRow {
  id: number;
  contact_phone: string;
  contact_name: string | null;
  matched_entity: string | null;
  matched_entity_id: number | null;
}

interface MessageRow {
  id: number;
  direction: "inbound" | "outbound";
  body: string | null;
  media_url: string | null;
  status: string | null;
  status_error: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
}

async function loadThread(threadId: number): Promise<{
  thread: ThreadRow | null;
  messages: MessageRow[];
}> {
  const { client, orgId } = await createOrgScopedSupabaseClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = client as any;

  const { data: thread } = await sb
    .from("whatsapp_thread")
    .select(
      "id, contact_phone, contact_name, matched_entity, matched_entity_id",
    )
    .eq("id", threadId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!thread) return { thread: null, messages: [] };

  const { data: messages } = await sb
    .from("whatsapp_message")
    .select(
      "id, direction, body, media_url, status, status_error, sent_at, delivered_at, read_at, created_at",
    )
    .eq("thread_id", threadId)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true })
    .limit(200);

  // Mark thread as read — clear unread_count when the user opens it.
  // Fire-and-forget: failure here shouldn't break the page render.
  if (thread.id) {
    try {
      await sb
        .from("whatsapp_thread")
        .update({ unread_count: 0 })
        .eq("id", thread.id)
        .eq("organization_id", orgId);
    } catch {
      /* swallow */
    }
  }

  return {
    thread: thread as ThreadRow,
    messages: (messages ?? []) as MessageRow[],
  };
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatDay(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function isSameDay(a: string, b: string): boolean {
  return a.slice(0, 10) === b.slice(0, 10);
}

export default async function WhatsAppThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("whatsapp.read");
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) notFound();

  const t = await getServerT();
  const { thread, messages } = await loadThread(numId);
  if (!thread) notFound();

  const canSend = await userHasPermission("whatsapp.send");

  return (
    <AppShell
      breadcrumb={[
        { label: t("nav.section.operations") },
        { label: t("nav.whatsapp"), href: "/app/whatsapp" },
        { label: thread.contact_name?.trim() || thread.contact_phone },
      ]}
      chatScope={{ level: "org", org: "travelplace" }}
      chatScopeLabel={`WhatsApp · ${
        thread.contact_name?.trim() || thread.contact_phone
      }`}
    >
      <div className="flex h-full flex-col">
        {/* Sticky header */}
        <header className="sticky top-0 z-10 border-b border-[var(--allonce-line)] bg-[var(--bg-surface)] px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <Link
              href="/app/whatsapp"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--ink-500)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--ink-900)]"
              aria-label={t("whatsapp.back")}
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-[14px] font-medium text-[var(--ink-900)]">
                  {thread.contact_name?.trim() || thread.contact_phone}
                </span>
                {thread.matched_entity === "hotel_contact" &&
                  thread.matched_entity_id != null && (
                    <Link
                      href={`/app/hotels/${thread.matched_entity_id}`}
                      className="inline-flex h-5 shrink-0 items-center rounded-full bg-[var(--bg-sunken)] px-2 text-[10px] font-medium tracking-wider text-[var(--ink-700)] transition hover:bg-[var(--bg-app)]"
                    >
                      {t("whatsapp.matched.hotel")}
                    </Link>
                  )}
                {thread.matched_entity === "order_client" &&
                  thread.matched_entity_id != null && (
                    <Link
                      href={`/app/orders/${thread.matched_entity_id}`}
                      className="inline-flex h-5 shrink-0 items-center rounded-full bg-[var(--bg-sunken)] px-2 text-[10px] font-medium tracking-wider text-[var(--ink-700)] transition hover:bg-[var(--bg-app)]"
                    >
                      {t("whatsapp.matched.order")} #{thread.matched_entity_id}
                    </Link>
                  )}
              </div>
              {thread.contact_name && (
                <p className="truncate font-mono text-[11px] text-[var(--ink-500)]">
                  {thread.contact_phone}
                </p>
              )}
            </div>
          </div>
        </header>

        {/* Message list */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="mx-auto max-w-3xl space-y-1.5">
            {messages.length === 0 ? (
              <p className="py-12 text-center text-[13px] text-[var(--ink-400)]">
                {t("whatsapp.no_messages")}
              </p>
            ) : (
              messages.map((m, i) => {
                const prev = i > 0 ? messages[i - 1] : null;
                const showDay =
                  !prev || !isSameDay(prev.created_at, m.created_at);
                const isOut = m.direction === "outbound";
                return (
                  <div key={m.id}>
                    {showDay && (
                      <div className="my-3 flex items-center justify-center">
                        <span className="rounded-full bg-[var(--bg-sunken)] px-3 py-0.5 text-[11px] text-[var(--ink-500)]">
                          {formatDay(m.created_at)}
                        </span>
                      </div>
                    )}
                    <div
                      className={`flex ${
                        isOut ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`group max-w-[78%] rounded-2xl px-3 py-2 text-[14px] leading-snug ${
                          isOut
                            ? "bg-sky-100/70 text-[var(--ink-900)]"
                            : "bg-[var(--bg-sunken)] text-[var(--ink-900)]"
                        }`}
                        title={new Date(m.created_at).toLocaleString()}
                      >
                        {m.body && (
                          <p className="whitespace-pre-wrap break-words">
                            {m.body}
                          </p>
                        )}
                        {m.media_url && (
                          <a
                            href={m.media_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-block text-[12px] text-sky-700 underline"
                          >
                            📎 media
                          </a>
                        )}
                        <div className="mt-1 flex items-center justify-end gap-1.5 text-[10px] text-[var(--ink-400)]">
                          <span className="tabular-nums">
                            {formatTime(m.created_at)}
                          </span>
                          {isOut && <StatusGlyph status={m.status} />}
                        </div>
                        {isOut && m.status === "failed" && m.status_error && (
                          <p className="mt-0.5 text-right text-[10.5px] text-rose-600">
                            {m.status_error}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <AutoScrollAnchor messageCount={messages.length} />
          </div>
        </div>

        {/* Composer */}
        <Composer threadId={thread.id} canSend={canSend} />
      </div>
    </AppShell>
  );
}
