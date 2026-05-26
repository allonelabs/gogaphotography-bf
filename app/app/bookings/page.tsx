import Link from "next/link";
import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { FilterChips } from "@/app/app/_components/FilterChips";
import { EmptyState, Icon } from "@/app/app/_components/EmptyState";
import { ListSearch } from "@/app/app/_components/ListSearch";
import { safeLike } from "@/app/lib/goga/safe-like";

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

const STATUS_TONE: Record<string, string> = {
  inquiry: "bg-slate-100 text-slate-700",
  reserved: "bg-blue-50 text-blue-700",
  confirmed: "bg-emerald-50 text-emerald-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-rose-50 text-rose-700",
  no_show: "bg-rose-50 text-rose-700",
};

const DEPOSIT_TONE: Record<string, string> = {
  none: "bg-slate-100 text-slate-700",
  pending: "bg-amber-50 text-amber-700",
  paid: "bg-emerald-50 text-emerald-700",
  refunded: "bg-rose-50 text-rose-700",
  failed: "bg-rose-50 text-rose-700",
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

type Props = { searchParams: Promise<{ status?: string; q?: string }> };

export default async function BookingsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const sb = gogaAdmin();
  const active: FilterStatus | null = (
    FILTER_STATUSES as readonly string[]
  ).includes(sp.status ?? "")
    ? (sp.status as FilterStatus)
    : null;
  const query = (sp.q ?? "").trim();

  const [{ data: counts }, { data }] = await Promise.all([
    sb.from("bookings").select("status"),
    (() => {
      let q = sb
        .from("bookings")
        .select(
          "id, shoot_date, shoot_time, location, subtotal_cents, deposit_cents, currency, status, deposit_status, client_name, client_email",
        )
        .order("shoot_date", { ascending: true });
      if (active) q = q.eq("status", active);
      if (query) {
        const like = safeLike(query);
        q = q.or(
          `client_name.ilike.${like},client_email.ilike.${like},location.ilike.${like}`,
        );
      }
      return q;
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
              {active
                ? `${bookings.length} of ${totalAll} · filtered by ${STATUS_LABELS[active]}`
                : `${totalAll} total`}
            </p>
          </div>
        </header>

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
                  className="grid grid-cols-[110px_1fr_120px_110px_120px] items-center gap-4 px-5 py-4"
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
      </div>
    </AppShell>
  );
}
