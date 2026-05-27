import Link from "next/link";
import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { EmptyState, Icon } from "@/app/app/_components/EmptyState";
import { Pagination, parsePage } from "@/app/app/_components/Pagination";
import { RealtimeRefresh } from "@/app/app/_components/useRealtimeRefresh";

const PAGE_SIZE = 50;

export const dynamic = "force-dynamic";
export const metadata = { title: "Deliveries" };

type Props = { searchParams: Promise<{ page?: string }> };

export default async function DeliveriesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { page, from, to } = parsePage(sp.page, PAGE_SIZE);
  const sb = gogaAdmin();
  const { data, count } = await sb
    .from("deliveries")
    .select(
      `id, token, password_hash, expires_at, downloads_enabled, archived,
       view_count, last_viewed_at, created_at, booking_id,
       bookings(client_name, shoot_date)`,
      { count: "exact" },
    )
    .eq("archived", false)
    .order("created_at", { ascending: false })
    .range(from, to);
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

        <RealtimeRefresh tables={["deliveries"]} />

        {items.length === 0 ? (
          <EmptyState
            icon={<Icon name="image" />}
            title="No deliveries yet"
            description="Open a booking detail page after the shoot and hit “Create delivery gallery” to share photos with the client."
          />
        ) : (
          <ul className="space-y-2">
            {items.map((d) => (
              <li
                key={d.id}
                className="rounded-2xl bg-white ring-1 ring-black/5 transition hover:ring-black/10"
              >
                <Link
                  href={`/app/deliveries/${d.id}`}
                  className="grid grid-cols-1 items-start gap-y-1 gap-x-4 px-5 py-4 sm:grid-cols-[1fr_120px_120px] sm:items-center"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-medium text-[var(--ink-900)]">
                      {d.bookings?.client_name ?? "(no client)"}
                      {d.bookings?.shoot_date ? (
                        <span className="ml-2 font-mono text-[11px] font-normal tabular-nums text-[var(--ink-500)]">
                          {new Date(d.bookings.shoot_date).toLocaleDateString()}
                        </span>
                      ) : null}
                    </div>
                    <div className="truncate font-mono text-[11px] text-[var(--ink-400)]">
                      /gallery/{d.token} ·{" "}
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
                        ? "bg-white text-slate-900 ring-1 ring-inset ring-black/15"
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

        <Pagination
          basePath="/app/deliveries"
          page={page}
          pageSize={PAGE_SIZE}
          totalCount={count ?? items.length}
        />
      </div>
    </AppShell>
  );
}
