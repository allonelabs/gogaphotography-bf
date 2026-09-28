import Link from "next/link";
import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { getServerTr, getServerLocale } from "@/app/lib/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Chatbot" };

function fmt(iso: string | null, dateLocale: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString(dateLocale);
}

const PREVIEW_CHARS = 140;

function preview(text: string): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > PREVIEW_CHARS
    ? `${oneLine.slice(0, PREVIEW_CHARS - 1)}…`
    : oneLine;
}

export default async function ChatbotIndex() {
  const tr = await getServerTr();
  const locale = await getServerLocale();
  const dateLocale = locale === "ka" ? "ka-GE" : "en-US";
  const sb = gogaAdmin();
  // Each row leads with the visitor's opening question — that, not a token
  // fragment, is what tells Goga which conversation is worth opening. The
  // embedded filter/order/limit apply to the messages, not the sessions.
  const { data } = await sb
    .from("chatbot_sessions")
    .select(
      "id, session_token, locale, lead_id, started_at, message_count, ip, chatbot_messages(content)",
    )
    .eq("chatbot_messages.role", "user")
    .order("started_at", { ascending: false })
    .order("created_at", {
      referencedTable: "chatbot_messages",
      ascending: true,
    })
    .limit(1, { referencedTable: "chatbot_messages" })
    .limit(200);
  const sessions = data ?? [];

  return (
    <AppShell
      breadcrumb={[
        { label: tr("Inbox", "შემოსული") },
        { label: tr("Chatbot", "ჩატბოტი") },
      ]}
      chatScope={{ level: "tool", tool: "chatbot" }}
      chatScopeLabel={tr("Chatbot", "ჩატბოტი")}
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-5">
          <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
            {tr("Chatbot", "ჩატბოტი")}
          </h1>
          <p className="mt-1 text-[12px] uppercase tracking-[0.22em] text-[var(--ink-500)]">
            {tr(
              `${sessions.length} sessions · last 200`,
              `${sessions.length} სესია · ბოლო 200`,
            )}
          </p>
        </header>

        {sessions.length === 0 ? (
          <div className="rounded-2xl bg-white px-8 py-10 text-center ring-1 ring-black/5">
            <p className="text-[14px] text-[var(--ink-500)]">
              {tr(
                "No chatbot conversations yet. The widget lives on every public page bottom-right.",
                "ჩატბოტის საუბრები ჯერ არ არის. ვიჯეტი ხელმისაწვდომია ყველა საჯარო გვერდზე, ქვედა მარჯვენა კუთხეში.",
              )}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="rounded-2xl bg-white ring-1 ring-black/5 transition hover:ring-black/10"
              >
                <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-5 py-4">
                  <Link href={`/admin/chatbot/${s.id}`} className="min-w-0">
                    <div className="truncate text-[14px] font-medium text-[var(--ink-900)]">
                      {s.chatbot_messages[0]?.content ? (
                        `“${preview(s.chatbot_messages[0].content)}”`
                      ) : (
                        <span className="text-[var(--ink-500)]">
                          {tr("Session", "სესია")} {s.session_token.slice(0, 8)}
                          …
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-[var(--ink-500)]">
                      {fmt(s.started_at, dateLocale)}
                      {s.ip ? ` · ${s.ip}` : ""}
                    </div>
                  </Link>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-slate-700">
                    {(s.locale ?? "en").toUpperCase()}
                  </span>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-slate-700">
                    {tr(
                      `${s.message_count} msgs`,
                      `${s.message_count} შეტყობინება`,
                    )}
                  </span>
                  {s.lead_id ? (
                    <Link
                      href={`/admin/leads/${s.lead_id}`}
                      className="shrink-0 rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-white transition hover:bg-slate-700"
                    >
                      {tr("→ Lead", "→ ლიდი")}
                    </Link>
                  ) : (
                    <span className="w-14 text-center text-[11px] text-[var(--ink-300)]">
                      —
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
