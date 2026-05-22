import Link from "next/link";
import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contracts" };

const STATUS_TONE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-50 text-blue-700",
  signed: "bg-emerald-50 text-emerald-700",
  void: "bg-rose-50 text-rose-700",
};

export default async function ContractsPage() {
  const sb = gogaAdmin();
  const { data } = await sb
    .from("contracts")
    .select(
      "id, status, signer_name, signer_email, signed_at, sent_at, created_at, booking_id",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  const items = data ?? [];

  return (
    <AppShell
      breadcrumb={[{ label: "Pipeline" }, { label: "Contracts" }]}
      chatScope={{ level: "tool", tool: "contracts" }}
      chatScopeLabel="Contracts"
    >
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-5">
          <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
            Contracts
          </h1>
          <p className="mt-1 text-[12px] uppercase tracking-[0.22em] text-[var(--ink-500)]">
            {items.length} total
          </p>
        </header>

        {items.length === 0 ? (
          <div className="rounded-2xl bg-white px-8 py-10 text-center ring-1 ring-black/5">
            <p className="text-[14px] text-[var(--ink-500)]">
              No contracts yet. Create one from a booking detail page.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((c) => (
              <li
                key={c.id}
                className="rounded-2xl bg-white ring-1 ring-black/5 transition hover:ring-black/10"
              >
                <Link
                  href={`/app/contracts/${c.id}`}
                  className="grid grid-cols-[1fr_140px_100px] items-center gap-4 px-5 py-4"
                >
                  <div>
                    <div className="text-[14px] font-medium text-[var(--ink-900)]">
                      {c.signer_name ?? "(no signer)"}
                    </div>
                    <div className="text-[12px] text-[var(--ink-500)]">
                      {c.signer_email ?? ""}
                    </div>
                  </div>
                  <span className="text-[12px] text-[var(--ink-500)]">
                    {c.signed_at
                      ? `signed ${new Date(c.signed_at).toLocaleDateString()}`
                      : c.sent_at
                        ? `sent ${new Date(c.sent_at).toLocaleDateString()}`
                        : `created ${c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}`}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-center text-[10px] uppercase tracking-[0.14em] ${
                      STATUS_TONE[c.status] ?? STATUS_TONE.draft
                    }`}
                  >
                    {c.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
