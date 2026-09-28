import Link from "next/link";
import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { FilterChips } from "@/app/admin/(dashboard)/_components/FilterChips";
import {
  EmptyState,
  Icon,
} from "@/app/admin/(dashboard)/_components/EmptyState";
import {
  Pagination,
  parsePage,
} from "@/app/admin/(dashboard)/_components/Pagination";
import { RealtimeRefresh } from "@/app/admin/(dashboard)/_components/useRealtimeRefresh";
import { getServerTr, getServerLocale } from "@/app/lib/i18n/server";

const PAGE_SIZE = 50;

export const dynamic = "force-dynamic";
export const metadata = { title: "Contracts" };

const STATUS_TONE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-white text-slate-900 ring-1 ring-inset ring-black/15",
  signed: "bg-slate-900 text-white",
  void: "bg-slate-100 text-slate-400 line-through",
};
function statusLabels(
  tr: (en: string, ka: string) => string,
): Record<string, string> {
  return {
    draft: tr("Draft", "მონახაზი"),
    sent: tr("Sent", "გაგზავნილი"),
    signed: tr("Signed", "ხელმოწერილი"),
    void: tr("Void", "გაუქმებული"),
  };
}
const FILTER_STATUSES = ["draft", "sent", "signed", "void"] as const;
type FilterStatus = (typeof FILTER_STATUSES)[number];

type Props = {
  searchParams: Promise<{ status?: string; page?: string }>;
};

export default async function ContractsPage({ searchParams }: Props) {
  const tr = await getServerTr();
  const locale = await getServerLocale();
  const dateLocale = locale === "ka" ? "ka-GE" : undefined;
  const STATUS_LABELS = statusLabels(tr);
  const sp = await searchParams;
  const sb = gogaAdmin();
  const active: FilterStatus | null = (
    FILTER_STATUSES as readonly string[]
  ).includes(sp.status ?? "")
    ? (sp.status as FilterStatus)
    : null;
  const { page, from, to } = parsePage(sp.page, PAGE_SIZE);

  const [{ data: counts }, { data, count }] = await Promise.all([
    sb.from("contracts").select("status"),
    (() => {
      let q = sb
        .from("contracts")
        .select(
          "id, status, signer_name, signer_email, signed_at, sent_at, created_at, booking_id",
          { count: "exact" },
        )
        .order("created_at", { ascending: false });
      if (active) q = q.eq("status", active);
      return q.range(from, to);
    })(),
  ]);

  const countByStatus: Record<string, number> = {};
  for (const r of counts ?? []) {
    countByStatus[r.status] = (countByStatus[r.status] ?? 0) + 1;
  }
  const items = data ?? [];
  const totalAll = (counts ?? []).length;

  return (
    <AppShell
      breadcrumb={[
        { label: tr("Pipeline", "პროცესი") },
        { label: tr("Contracts", "ხელშეკრულებები") },
      ]}
      chatScope={{ level: "tool", tool: "contracts" }}
      chatScopeLabel={tr("Contracts", "ხელშეკრულებები")}
    >
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-5">
          <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
            {tr("Contracts", "ხელშეკრულებები")}
          </h1>
          <p className="mt-1 text-[12px] uppercase tracking-[0.22em] text-[var(--ink-500)]">
            {active
              ? tr(
                  `${items.length} of ${totalAll} · filtered by ${STATUS_LABELS[active]}`,
                  `${items.length} / ${totalAll} · გაფილტრულია: ${STATUS_LABELS[active]}`,
                )
              : tr(`${totalAll} total`, `სულ ${totalAll}`)}
          </p>
        </header>

        <RealtimeRefresh tables={["contracts"]} />
        <FilterChips
          basePath="/admin/contracts"
          active={active}
          chips={FILTER_STATUSES.map((s) => ({
            value: s,
            label: STATUS_LABELS[s] ?? s,
            count: countByStatus[s] ?? 0,
          }))}
        />

        {items.length === 0 ? (
          <EmptyState
            icon={<Icon name="scroll" />}
            title={
              active
                ? tr(
                    `Nothing in the "${STATUS_LABELS[active]}" bucket`,
                    `„${STATUS_LABELS[active]}" კატეგორიაში არაფერია`,
                  )
                : tr("No contracts yet", "ხელშეკრულებები ჯერ არ არის")
            }
            description={
              active
                ? tr(
                    "Try a different status — or clear the filter.",
                    "სცადეთ სხვა სტატუსი — ან გაასუფთავეთ ფილტრი.",
                  )
                : tr(
                    'Open a booking detail page and click "Create / open contract" to start one.',
                    'გახსენით ჯავშნის დეტალები და დააჭირეთ „ხელშეკრულების შექმნა/გახსნა" დასაწყებად.',
                  )
            }
            secondary={
              active
                ? {
                    label: tr("All contracts", "ყველა ხელშეკრულება"),
                    href: "/admin/contracts",
                  }
                : undefined
            }
          />
        ) : (
          <ul className="space-y-2">
            {items.map((c) => (
              <li
                key={c.id}
                className="rounded-2xl bg-white ring-1 ring-black/5 transition hover:ring-black/10"
              >
                <Link
                  href={`/admin/contracts/${c.id}`}
                  className="grid grid-cols-1 items-start gap-y-1 gap-x-4 px-5 py-4 sm:grid-cols-[1fr_140px_100px] sm:items-center"
                >
                  <div>
                    <div className="text-[14px] font-medium text-[var(--ink-900)]">
                      {c.signer_name ??
                        tr("(no signer)", "(ხელმომწერელი არ არის)")}
                    </div>
                    <div className="text-[12px] text-[var(--ink-500)]">
                      {c.signer_email ?? ""}
                    </div>
                  </div>
                  <span className="text-[12px] text-[var(--ink-500)]">
                    {c.signed_at
                      ? tr(
                          `signed ${new Date(c.signed_at).toLocaleDateString(dateLocale)}`,
                          `ხელმოწერილია ${new Date(c.signed_at).toLocaleDateString(dateLocale)}`,
                        )
                      : c.sent_at
                        ? tr(
                            `sent ${new Date(c.sent_at).toLocaleDateString(dateLocale)}`,
                            `გაგზავნილია ${new Date(c.sent_at).toLocaleDateString(dateLocale)}`,
                          )
                        : tr(
                            `created ${c.created_at ? new Date(c.created_at).toLocaleDateString(dateLocale) : "—"}`,
                            `შექმნილია ${c.created_at ? new Date(c.created_at).toLocaleDateString(dateLocale) : "—"}`,
                          )}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-center text-[10px] uppercase tracking-[0.14em] ${
                      STATUS_TONE[c.status] ?? STATUS_TONE.draft
                    }`}
                  >
                    {STATUS_LABELS[c.status] ?? c.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <Pagination
          basePath="/admin/contracts"
          page={page}
          pageSize={PAGE_SIZE}
          totalCount={count ?? items.length}
          searchParams={{ status: active ?? undefined }}
        />
      </div>
    </AppShell>
  );
}
