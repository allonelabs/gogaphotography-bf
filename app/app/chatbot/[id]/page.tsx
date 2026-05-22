import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ChatbotTranscriptPage({ params }: Props) {
  const { id } = await params;
  const sb = gogaAdmin();
  const [{ data: session }, { data: messages }] = await Promise.all([
    sb
      .from("chatbot_sessions")
      .select(
        "id, session_token, locale, lead_id, ip, user_agent, started_at, message_count",
      )
      .eq("id", id)
      .single(),
    sb
      .from("chatbot_messages")
      .select("id, role, content, tool_calls, created_at")
      .eq("session_id", id)
      .order("created_at", { ascending: true }),
  ]);
  if (!session) notFound();

  return (
    <AppShell
      breadcrumb={[
        { label: "Inbox" },
        { label: "Chatbot", href: "/app/chatbot" },
        { label: "Session" },
      ]}
      chatScope={{ level: "tool", tool: "chatbot" }}
      chatScopeLabel="Chatbot session"
    >
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-5 flex items-baseline justify-between">
          <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
            Chat session
          </h1>
          <div className="flex items-center gap-2">
            {session.lead_id ? (
              <Link
                href={`/app/leads/${session.lead_id}`}
                className="rounded-full border border-black/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--ink-700)] hover:bg-slate-50"
              >
                → Lead
              </Link>
            ) : null}
            <Link
              href="/app/chatbot"
              className="rounded-full border border-black/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--ink-700)] hover:bg-slate-50"
            >
              ← back
            </Link>
          </div>
        </header>

        <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <dl className="grid grid-cols-[100px_1fr] gap-y-1.5 text-[13px]">
            <dt className="text-[var(--ink-400)]">Token</dt>
            <dd className="font-mono text-[12px]">{session.session_token}</dd>
            <dt className="text-[var(--ink-400)]">Started</dt>
            <dd>
              {session.started_at
                ? new Date(session.started_at).toLocaleString()
                : ""}
            </dd>
            <dt className="text-[var(--ink-400)]">Locale</dt>
            <dd>{session.locale ?? "en"}</dd>
            {session.ip ? (
              <>
                <dt className="text-[var(--ink-400)]">IP</dt>
                <dd>{session.ip}</dd>
              </>
            ) : null}
            <dt className="text-[var(--ink-400)]">Messages</dt>
            <dd>{session.message_count}</dd>
          </dl>
        </section>

        <section className="mt-5 flex flex-col gap-2">
          {(messages ?? []).map((m) => {
            if (m.role === "tool") {
              return (
                <details
                  key={m.id}
                  className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-[var(--ink-500)] ring-1 ring-black/5"
                >
                  <summary className="cursor-pointer list-none">
                    ⚙ tool result ·{" "}
                    {m.created_at
                      ? new Date(m.created_at).toLocaleTimeString()
                      : ""}
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px]">
                    {JSON.stringify(m.tool_calls ?? m.content, null, 2)}
                  </pre>
                </details>
              );
            }
            const isUser = m.role === "user";
            return (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-xl px-4 py-3 text-[14px] leading-[1.55] whitespace-pre-wrap ${
                  isUser
                    ? "self-end bg-[var(--ink-900)] text-white"
                    : "self-start bg-white text-[var(--ink-900)] ring-1 ring-black/5"
                }`}
              >
                <div
                  className={`mb-1 text-[10px] uppercase tracking-[0.22em] ${
                    isUser ? "text-white/55" : "text-[var(--ink-500)]"
                  }`}
                >
                  {isUser ? "Visitor" : "Goga Assistant"} ·{" "}
                  {m.created_at
                    ? new Date(m.created_at).toLocaleTimeString()
                    : ""}
                </div>
                {m.content}
              </div>
            );
          })}
        </section>
      </div>
    </AppShell>
  );
}
