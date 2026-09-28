// app/app/messages/page.tsx
import Link from "next/link";
import { AppShell } from "@/app/components/app/AppShell";
import { listThreads } from "@/app/lib/goga/meta-threads";
import { getServerTr, getServerLocale } from "@/app/lib/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  const threads = await listThreads();
  const tr = await getServerTr();
  const locale = await getServerLocale();
  const dateLocale = locale === "ka" ? "ka-GE" : "en-US";
  return (
    <AppShell
      breadcrumb={[
        { label: tr("Inbox", "შემოსული") },
        { label: tr("Messages", "მესიჯები") },
      ]}
      chatScope={{ level: "tool", tool: "messages" }}
      chatScopeLabel={tr("Messages", "მესიჯები")}
    >
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[var(--ink-900)]">
            {tr("Messages", "მესიჯები")}
          </h1>
          <Link
            href="/admin/messages/settings"
            className="text-[12px] uppercase tracking-[0.18em] text-[var(--ink-500)] underline"
          >
            {tr("Settings", "პარამეტრები")}
          </Link>
        </div>
        <ul className="divide-y rounded-2xl bg-white ring-1 ring-black/5">
          {threads.map((t) => (
            <li key={t.id}>
              <Link
                href={`/admin/messages/${t.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-black/5"
              >
                <span>
                  <span className="rounded bg-black/5 px-1.5 py-0.5 text-[10px] uppercase">
                    {t.channel}
                  </span>{" "}
                  <strong className="ml-2">
                    {t.display_name ?? t.external_id}
                  </strong>
                </span>
                <span className="text-xs text-neutral-400">
                  {t.handoff ? tr("human", "ადამიანი") : tr("bot", "ბოტი")} ·{" "}
                  {t.last_message_at
                    ? new Date(t.last_message_at).toLocaleString(dateLocale)
                    : "—"}
                </span>
              </Link>
            </li>
          ))}
          {threads.length === 0 && (
            <li className="px-4 py-6 text-sm text-neutral-400">
              {tr("No conversations yet.", "საუბრები ჯერ არ არის.")}
            </li>
          )}
        </ul>
      </div>
    </AppShell>
  );
}
