import Link from "next/link";
import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { FilterChips } from "@/app/app/_components/FilterChips";
import { EmptyState, Icon } from "@/app/app/_components/EmptyState";
import { ListSearch } from "@/app/app/_components/ListSearch";
import { Pagination, parsePage } from "@/app/app/_components/Pagination";
import { RealtimeRefresh } from "@/app/app/_components/useRealtimeRefresh";
import { safeLike } from "@/app/lib/goga/safe-like";

const PAGE_SIZE = 50;

export const dynamic = "force-dynamic";
export const metadata = { title: "Bookings" };

function fmtMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(0)} ${currency}`;
  }
}

/** Monochrome status / deposit tones — see lib/goga/leads.ts STAGE_TONE. */
const STATUS_TONE: Record<string, string> = {
  inquiry: "bg-slate-100 text-slate-600",
  reserved: "bg-white text-slate-900 ring-1 ring-inset ring-black/15",
  confirmed: "bg-slate-900 text-white",
  completed: "bg-slate-200 text-slate-900",
  cancelled: "bg-slate-100 text-slate-400 line-through",
  no_show: "bg-slate-100 text-slate-400 line-through",
};

const DEPOSIT_TONE: Record<string, string> = {
  none: "bg-slate-100 text-slate-600",
  pending: "bg-white text-slate-900 ring-1 ring-inset ring-black/15",
  paid: "bg-slate-900 text-white",
  refunded: "bg-slate-200 text-slate-900",
  failed: "bg-slate-100 text-slate-400 line-through",
};

const STATUS_LABELS: Record<string, string> = {
  inquiry: "Inquiry",
  reserved: "Reserved",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};
const DEPOSIT_LABELS: Record<string, string> = {
  none: "No deposit",
  pending: "Pending",
  paid: "Paid",
  refunded: "Refunded",
  failed: "Failed",
};

const FILTER_STATUSES = [
  "inquiry",
  "reserved",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
] as const;
type FilterStatus = (typeof FILTER_STATUSES)[number];

type Props = {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
};

export default async function BookingsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const sb = gogaAdmin();
  const active: FilterStatus | null = (
    FILTER_STATUSES as readonly string[]
  ).includes(sp.status ?? "")
    ? (sp.status as FilterStatus)
    : null;
  const query = (sp.q ?? "").trim();
  const { page, from, to } = parsePage(sp.page, PAGE_SIZE);

  const [{ data: counts }, { data, count }] = await Promise.all([
    sb.from("bookings").select("status"),
    (() => {
      let q = sb
        .from("bookings")
        .select(
          "id, shoot_date, shoot_time, location, subtotal_cents, deposit_cents, currency, status, deposit_status, client_name, client_email",
          { count: "exact" },
        )
        .order("shoot_date", { ascending: true });
      if (active) q = q.eq("status", active);
      if (query) {
        const like = safeLike(query);
        q = q.or(
          `client_name.ilike.${like},client_email.ilike.${like},location.ilike.${like}`,
        );
      }
      return q.range(from, to);
    })(),
  ]);

  const countByStatus: Record<string, number> = {};
  for (const r of counts ?? []) {
    countByStatus[r.status] = (countByStatus[r.status] ?? 0) + 1;
  }
  const bookings = data ?? [];
  const totalAll = (counts ?? []).length;

  return (
    <AppShell
      breadcrumb={[{ label: "Pipeline" }, { label: "Bookings" }]}
      chatScope={{ level: "tool", tool: "bookings" }}
      chatScopeLabel="Bookings"
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-5 flex items-baseline justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
              Bookings
            </h1>
            <p className="mt-1 text-[12px] uppercase tracking-[0.22em] text-[var(--ink-500)]">
              {active || query
                ? `${count ?? bookings.length} of ${totalAll} · filtered`
                : `${totalAll} total`}
            </p>
          </div>
        </header>

        <RealtimeRefresh tables={["bookings"]} />
        <ListSearch placeholder="Search bookings by client, email, or location…" />

        <FilterChips
          basePath="/app/bookings"
          active={active}
          chips={FILTER_STATUSES.map((s) => ({
            value: s,
            label: STATUS_LABELS[s] ?? s,
            count: countByStatus[s] ?? 0,
          }))}
        />

        {bookings.length === 0 ? (
          <EmptyState
            icon={<Icon name="calendar" />}
            title={
              query
                ? `No bookings match “${query}”`
                : active
                  ? `Nothing in the “${STATUS_LABELS[active]}” bucket`
                  : "No bookings yet"
            }
            description={
              query
                ? "Try a different name, email, or location."
                : active
                  ? "Try a different status filter — or clear it."
                  : "Bookings are created from a lead detail page or via the public /book route."
            }
            secondary={
              query || active
                ? { label: "Clear filters", href: "/app/bookings" }
                : undefined
            }
          />
        ) : (
          <ul className="space-y-2">
            {bookings.map((b) => (
              <li
                key={b.id}
                className="rounded-2xl bg-white ring-1 ring-black/5 transition hover:ring-black/10"
              >
                <Link
                  href={`/app/bookings/${b.id}`}
                  className="grid grid-cols-1 items-start gap-y-1 gap-x-4 px-5 py-4 sm:grid-cols-[110px_1fr_120px_110px_120px] sm:items-center"
                >
                  <span className="text-[13px] font-medium tabular-nums text-[var(--ink-900)]">
                    {new Date(b.shoot_date).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                    {b.shoot_time ? (
                      <span className="text-[var(--ink-500)]">
                        {" "}
                        · {b.shoot_time}
                      </span>
                    ) : null}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-medium text-[var(--ink-900)]">
                      {b.client_name ?? "Unnamed client"}
                    </div>
                    <div className="truncate text-[12px] text-[var(--ink-500)]">
                      {b.client_email ?? "(no email)"}
                      {b.location ? ` · ${b.location}` : ""}
                    </div>
                  </div>
                  <span className="text-[14px] font-medium tabular-nums text-[var(--ink-900)]">
                    {fmtMoney(b.subtotal_cents, b.currency)}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-center text-[10px] uppercase tracking-[0.14em] ${
                      DEPOSIT_TONE[b.deposit_status] ?? DEPOSIT_TONE.none
                    }`}
                  >
                    {DEPOSIT_LABELS[b.deposit_status] ?? b.deposit_status}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-center text-[10px] uppercase tracking-[0.14em] ${
                      STATUS_TONE[b.status] ?? STATUS_TONE.inquiry
                    }`}
                  >
                    {STATUS_LABELS[b.status] ?? b.status.replace("_", " ")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <Pagination
          basePath="/app/bookings"
          page={page}
          pageSize={PAGE_SIZE}
          totalCount={count ?? bookings.length}
          searchParams={{ status: active ?? undefined, q: query || undefined }}
        />
      </div>
    </AppShell>
  );
}
