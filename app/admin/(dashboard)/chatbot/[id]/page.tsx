import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { DeleteSessionButton } from "./_delete";
import { getServerTr, getServerLocale } from "@/app/lib/i18n/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

function getLocaleNames(
  tr: (en: string, ka: string) => string,
): Record<string, string> {
  return {
    ka: tr("Georgian", "ქართული"),
    en: tr("English", "ინგლისური"),
    ru: tr("Russian", "რუსული"),
  };
}

// The site's /api/chat stamps `{ error: true }` on a reply the model never
// produced — the "we're busy" fallback the visitor saw instead of an answer.
function isFailedReply(toolCalls: unknown): boolean {
  return (
    typeof toolCalls === "object" &&
    toolCalls !== null &&
    (toolCalls as { error?: unknown }).error === true
  );
}

export default async function ChatbotTranscriptPage({ params }: Props) {
  const { id } = await params;
  const tr = await getServerTr();
  const locale = await getServerLocale();
  const dateLocale = locale === "ka" ? "ka-GE" : "en-US";
  const LOCALE_NAME = getLocaleNames(tr);
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
        { label: tr("Inbox", "შემოსული") },
        { label: tr("Chatbot", "ჩატბოტი"), href: "/admin/chatbot" },
        { label: tr("Session", "სესია") },
      ]}
      chatScope={{ level: "tool", tool: "chatbot" }}
      chatScopeLabel={tr("Chatbot session", "ჩატის სესია")}
    >
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-5 flex items-baseline justify-between">
          <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
            {tr("Chat session", "ჩატის სესია")}
          </h1>
          <div className="flex items-center gap-2">
            {session.lead_id ? (
              <Link
                href={`/admin/leads/${session.lead_id}`}
                className="rounded-full border border-black/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--ink-700)] hover:bg-slate-50"
              >
                {tr("→ Lead", "→ ლიდი")}
              </Link>
            ) : null}
            <DeleteSessionButton id={session.id} />
            <Link
              href="/admin/chatbot"
              className="rounded-full border border-black/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--ink-700)] hover:bg-slate-50"
            >
              {tr("← back", "← უკან")}
            </Link>
          </div>
        </header>

        <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <dl className="grid grid-cols-[100px_1fr] gap-y-1.5 text-[13px]">
            <dt className="text-[var(--ink-400)]">{tr("Token", "ტოკენი")}</dt>
            <dd className="font-mono text-[12px]">{session.session_token}</dd>
            <dt className="text-[var(--ink-400)]">
              {tr("Started", "დაწყებულია")}
            </dt>
            <dd>
              {session.started_at
                ? new Date(session.started_at).toLocaleString(dateLocale)
                : ""}
            </dd>
            <dt className="text-[var(--ink-400)]">{tr("Language", "ენა")}</dt>
            <dd>
              {LOCALE_NAME[session.locale ?? ""] ?? session.locale ?? "—"}
            </dd>
            {session.ip ? (
              <>
                <dt className="text-[var(--ink-400)]">IP</dt>
                <dd>{session.ip}</dd>
              </>
            ) : null}
            <dt className="text-[var(--ink-400)]">
              {tr("Messages", "მესიჯები")}
            </dt>
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
                    ⚙ {tr("tool result", "ხელსაწყოს შედეგი")} ·{" "}
                    {m.created_at
                      ? new Date(m.created_at).toLocaleTimeString(dateLocale)
                      : ""}
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px]">
                    {JSON.stringify(m.tool_calls ?? m.content, null, 2)}
                  </pre>
                </details>
              );
            }
            const isUser = m.role === "user";
            const failed = !isUser && isFailedReply(m.tool_calls);
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
                  {isUser
                    ? tr("Visitor", "სტუმარი")
                    : tr("Assistant", "ასისტენტი")}
                  {failed
                    ? ` · ${tr("failed to answer", "პასუხი ვერ გაიცა")}`
                    : ""}{" "}
                  ·{" "}
                  {m.created_at
                    ? new Date(m.created_at).toLocaleTimeString(dateLocale)
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
