// app/app/messages/[id]/page.tsx
import { notFound } from "next/navigation";
import { AppShell } from "@/app/components/app/AppShell";
import { getThread, threadMessages } from "@/app/lib/goga/meta-threads";
import { toggleHandoff, sendManualReply } from "@/app/lib/goga/actions-meta";

export const dynamic = "force-dynamic";
export const metadata = { title: "Conversation" };

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const thread = await getThread(id);
  if (!thread) notFound();
  const messages = await threadMessages(id);
  const reply = sendManualReply.bind(null, id);
  const setHandoffTrue = toggleHandoff.bind(null, id, true);
  const setHandoffFalse = toggleHandoff.bind(null, id, false);

  return (
    <AppShell
      breadcrumb={[
        { label: "Inbox" },
        { label: "Messages", href: "/app/messages" },
        { label: thread.display_name ?? thread.external_id },
      ]}
      chatScope={{ level: "tool", tool: "messages" }}
      chatScopeLabel="Messages"
    >
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold">
            {thread.display_name ?? thread.external_id}{" "}
            <span className="ml-2 text-xs text-neutral-400">
              {thread.channel}
            </span>
          </h1>
          {thread.handoff ? (
            <form action={setHandoffFalse}>
              <button className="rounded-full border px-3 py-1.5 text-xs">
                Resume bot
              </button>
            </form>
          ) : (
            <form action={setHandoffTrue}>
              <button className="rounded-full border px-3 py-1.5 text-xs">
                Take over
              </button>
            </form>
          )}
        </div>
        <div className="space-y-2">
          {messages.map((m) => (
            <div
              key={m.id}
              className={
                m.direction === "in" ? "flex justify-start" : "flex justify-end"
              }
            >
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                  m.direction === "in"
                    ? "bg-black/5"
                    : m.sender === "agent"
                      ? "bg-blue-600 text-white"
                      : "bg-black text-white"
                }`}
              >
                {m.text}
                <div className="mt-0.5 text-[10px] opacity-60">
                  {m.sender} · {new Date(m.created_at).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
        </div>
        <form action={reply} className="mt-4 flex gap-2">
          <input
            name="text"
            placeholder="Reply as the studio…"
            className="flex-1 rounded-full border px-4 py-2 text-sm"
          />
          <button className="rounded-full bg-black px-4 py-2 text-sm text-white">
            Send
          </button>
        </form>
      </div>
    </AppShell>
  );
}
