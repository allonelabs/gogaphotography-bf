import Link from "next/link";
import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";

export const dynamic = "force-dynamic";
export const metadata = { title: "Deliveries" };

export default async function DeliveriesPage() {
  const sb = gogaAdmin();
  const { data } = await sb
    .from("deliveries")
    .select(
      "id, token, password_hash, expires_at, downloads_enabled, archived, view_count, last_viewed_at, created_at, booking_id",
    )
    .eq("archived", false)
    .order("created_at", { ascending: false })
    .limit(200);
  const items = data ?? [];

  return (
    <AppShell
      breadcrumb={[{ label: "Pipeline" }, { label: "Deliveries" }]}
      chatScope={{ level: "tool", tool: "deliveries" }}
      chatScopeLabel="Deliveries"
    >
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-5">
          <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
            Deliveries
          </h1>
          <p className="mt-1 text-[12px] uppercase tracking-[0.22em] text-[var(--ink-500)]">
            {items.length} active galleries
          </p>
        </header>

        {items.length === 0 ? (
          <div className="rounded-2xl bg-white px-8 py-10 text-center ring-1 ring-black/5">
            <p className="text-[14px] text-[var(--ink-500)]">
              No deliveries yet. Create one from a booking detail page after the
              shoot.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((d) => (
              <li
                key={d.id}
                className="rounded-2xl bg-white ring-1 ring-black/5 transition hover:ring-black/10"
              >
                <Link
                  href={`/app/deliveries/${d.id}`}
                  className="grid grid-cols-[1fr_120px_120px] items-center gap-4 px-5 py-4"
                >
                  <div>
                    <div className="text-[14px] font-medium text-[var(--ink-900)]">
                      /gallery/{d.token}
                    </div>
                    <div className="text-[12px] text-[var(--ink-500)]">
                      {d.last_viewed_at
                        ? `last viewed ${new Date(d.last_viewed_at).toLocaleDateString()}`
                        : "never viewed"}
                    </div>
                  </div>
                  <span className="text-[12px] text-[var(--ink-500)]">
                    {d.view_count} view{d.view_count === 1 ? "" : "s"}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-center text-[10px] uppercase tracking-[0.14em] ${
                      d.password_hash
                        ? "bg-amber-50 text-amber-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {d.password_hash ? "Protected" : "Open"}
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
