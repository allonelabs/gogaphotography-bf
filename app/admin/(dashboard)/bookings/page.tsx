import Link from "next/link";
import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { FilterChips } from "@/app/admin/(dashboard)/_components/FilterChips";
import {
  EmptyState,
  Icon,
} from "@/app/admin/(dashboard)/_components/EmptyState";
import { ListSearch } from "@/app/admin/(dashboard)/_components/ListSearch";
import {
  Pagination,
  parsePage,
} from "@/app/admin/(dashboard)/_components/Pagination";
import { RealtimeRefresh } from "@/app/admin/(dashboard)/_components/useRealtimeRefresh";
import { safeLike } from "@/app/lib/goga/safe-like";
import { getServerTr, getServerLocale } from "@/app/lib/i18n/server";

const PAGE_SIZE = 50;

export const dynamic = "force-dynamic";
export const metadata = { title: "Bookings" };

function fmtMoney(cents: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
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

function statusLabels(
  tr: (en: string, ka: string) => string,
): Record<string, string> {
  return {
    inquiry: tr("Inquiry", "მოთხოვნა"),
    reserved: tr("Reserved", "დაჯავშნილი"),
    confirmed: tr("Confirmed", "დადასტურებული"),
    completed: tr("Completed", "დასრულებული"),
    cancelled: tr("Cancelled", "გაუქმებული"),
    no_show: tr("No-show", "არ გამოცხადდა"),
  };
}
function depositLabels(
  tr: (en: string, ka: string) => string,
): Record<string, string> {
  return {
    none: tr("No deposit", "ავანსის გარეშე"),
    pending: tr("Pending", "მოლოდინში"),
    paid: tr("Paid", "გადახდილი"),
    refunded: tr("Refunded", "დაბრუნებული"),
    failed: tr("Failed", "ვერ შესრულდა"),
  };
}

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
  const tr = await getServerTr();
  const locale = await getServerLocale();
  const intlLocale = locale === "ka" ? "ka-GE" : "en-US";
  const STATUS_LABELS = statusLabels(tr);
  const DEPOSIT_LABELS = depositLabels(tr);
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
      breadcrumb={[
        { label: tr("Pipeline", "სამუშაო პროცესი") },
        { label: tr("Bookings", "ჯავშნები") },
      ]}
      chatScope={{ level: "tool", tool: "bookings" }}
      chatScopeLabel={tr("Bookings", "ჯავშნები")}
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-5 flex items-baseline justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
              {tr("Bookings", "ჯავშნები")}
            </h1>
            <p className="mt-1 text-[12px] uppercase tracking-[0.22em] text-[var(--ink-500)]">
              {active || query
                ? `${count ?? bookings.length} ${tr("of", "/")} ${totalAll} · ${tr("filtered", "გაფილტრული")}`
                : `${totalAll} ${tr("total", "სულ")}`}
            </p>
          </div>
        </header>

        <RealtimeRefresh tables={["bookings"]} />
        <ListSearch
          placeholder={tr(
            "Search bookings by client, email, or location…",
            "ძიება: კლიენტი, ელფოსტა ან ლოკაცია…",
          )}
        />

        <FilterChips
          basePath="/admin/bookings"
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
                ? tr(
                    `No bookings match "${query}"`,
                    `ჯავშანი ვერ მოიძებნა „${query}“-სთვის`,
                  )
                : active
                  ? tr(
                      `Nothing in the "${STATUS_LABELS[active]}" bucket`,
                      `„${STATUS_LABELS[active]}“ ჯგუფში არაფერია`,
                    )
                  : tr("No bookings yet", "ჯერ ჯავშნები არ არის")
            }
            description={
              query
                ? tr(
                    "Try a different name, email, or location.",
                    "სცადეთ სხვა სახელი, ელფოსტა ან ლოკაცია.",
                  )
                : active
                  ? tr(
                      "Try a different status filter — or clear it.",
                      "სცადეთ სხვა სტატუსის ფილტრი — ან გაასუფთავეთ.",
                    )
                  : tr(
                      "Bookings are created from a lead detail page or via the public /book route.",
                      "ჯავშნები იქმნება ლიდის გვერდიდან ან საჯარო /book გვერდიდან.",
                    )
            }
            secondary={
              query || active
                ? {
                    label: tr("Clear filters", "ფილტრების გასუფთავება"),
                    href: "/admin/bookings",
                  }
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
                  href={`/admin/bookings/${b.id}`}
                  className="grid grid-cols-1 items-start gap-y-1 gap-x-4 px-5 py-4 sm:grid-cols-[110px_1fr_120px_110px_120px] sm:items-center"
                >
                  <span className="text-[13px] font-medium tabular-nums text-[var(--ink-900)]">
                    {new Date(b.shoot_date).toLocaleDateString(intlLocale, {
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
                      {b.client_name ?? tr("Unnamed client", "უსახელო კლიენტი")}
                    </div>
                    <div className="truncate text-[12px] text-[var(--ink-500)]">
                      {b.client_email ?? tr("(no email)", "(ელფოსტა არ არის)")}
                      {b.location ? ` · ${b.location}` : ""}
                    </div>
                  </div>
                  <span className="text-[14px] font-medium tabular-nums text-[var(--ink-900)]">
                    {fmtMoney(b.subtotal_cents, b.currency, intlLocale)}
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
          basePath="/admin/bookings"
          page={page}
          pageSize={PAGE_SIZE}
          totalCount={count ?? bookings.length}
          searchParams={{ status: active ?? undefined, q: query || undefined }}
        />
      </div>
    </AppShell>
  );
}
