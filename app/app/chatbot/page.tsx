import Link from "next/link";
import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";

export const dynamic = "force-dynamic";
export const metadata = { title: "Chatbot" };

function fmt(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString();
}

export default async function ChatbotIndex() {
  const sb = gogaAdmin();
  const { data } = await sb
    .from("chatbot_sessions")
    .select("id, session_token, locale, lead_id, started_at, message_count, ip")
    .order("started_at", { ascending: false })
    .limit(200);
  const sessions = data ?? [];

  return (
    <AppShell
      breadcrumb={[{ label: "Inbox" }, { label: "Chatbot" }]}
      chatScope={{ level: "tool", tool: "chatbot" }}
      chatScopeLabel="Chatbot"
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-5">
          <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
            Chatbot
          </h1>
          <p className="mt-1 text-[12px] uppercase tracking-[0.22em] text-[var(--ink-500)]">
            {sessions.length} sessions · last 200
          </p>
        </header>

        {sessions.length === 0 ? (
          <div className="rounded-2xl bg-white px-8 py-10 text-center ring-1 ring-black/5">
            <p className="text-[14px] text-[var(--ink-500)]">
              No chatbot conversations yet. The widget lives on every public
              page bottom-right.
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
                  <Link href={`/app/chatbot/${s.id}`} className="min-w-0">
                    <div className="text-[14px] font-medium text-[var(--ink-900)]">
                      Session {s.session_token.slice(0, 8)}…
                    </div>
                    <div className="text-[12px] text-[var(--ink-500)]">
                      {fmt(s.started_at)}
                      {s.ip ? ` · ${s.ip}` : ""}
                    </div>
                  </Link>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-slate-700">
                    {(s.locale ?? "en").toUpperCase()}
                  </span>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-slate-700">
                    {s.message_count} msgs
                  </span>
                  {s.lead_id ? (
                    <Link
                      href={`/app/leads/${s.lead_id}`}
                      className="shrink-0 rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-slate-900 font-medium transition hover:bg-slate-900"
                    >
                      → Lead
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
