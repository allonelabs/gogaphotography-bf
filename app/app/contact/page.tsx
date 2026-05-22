import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contact inbox" };

function fmt(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function ContactInbox() {
  const sb = gogaAdmin();
  const { data } = await sb
    .from("contact_submissions")
    .select("id, name, email, phone, message, locale, ip, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = data ?? [];

  return (
    <AppShell
      breadcrumb={[{ label: "Inbox" }, { label: "Contact form" }]}
      chatScope={{ level: "tool", tool: "contact" }}
      chatScopeLabel="Contact inbox"
    >
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-5">
          <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
            Contact inbox
          </h1>
          <p className="mt-1 text-[12px] uppercase tracking-[0.22em] text-[var(--ink-500)]">
            {rows.length} submissions · last 200
          </p>
        </header>

        {rows.length === 0 ? (
          <div className="rounded-2xl bg-white px-8 py-10 text-center ring-1 ring-black/5">
            <p className="text-[14px] text-[var(--ink-500)]">
              No inquiries yet. Submissions to the /contact form land here
              automatically.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li
                key={r.id}
                className="rounded-2xl bg-white p-5 ring-1 ring-black/5"
              >
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-3">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-[15px] font-medium text-[var(--ink-900)]">
                      {r.name || "Anonymous"}
                    </span>
                    {r.email ? (
                      <a
                        href={`mailto:${r.email}`}
                        className="text-[13px] text-[var(--ink-500)] transition hover:text-[var(--ao-accent)]"
                      >
                        {r.email}
                      </a>
                    ) : null}
                    {r.phone ? (
                      <a
                        href={`tel:${r.phone}`}
                        className="text-[13px] text-[var(--ink-500)] transition hover:text-[var(--ao-accent)]"
                      >
                        · {r.phone}
                      </a>
                    ) : null}
                  </div>
                  <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--ink-500)]">
                    {fmt(r.created_at)}
                    {r.locale ? ` · ${r.locale.toUpperCase()}` : ""}
                  </span>
                </div>
                <p className="m-0 whitespace-pre-wrap text-[14px] leading-[1.55] text-[var(--ink-800)]">
                  {r.message}
                </p>
                {r.ip ? (
                  <p className="mt-3 text-[11px] text-[var(--ink-400)]">
                    IP: {r.ip}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
