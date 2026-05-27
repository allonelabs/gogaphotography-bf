import Link from "next/link";
import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { FilterChips } from "@/app/app/_components/FilterChips";
import { EmptyState, Icon } from "@/app/app/_components/EmptyState";
import { Pagination, parsePage } from "@/app/app/_components/Pagination";
import { RealtimeRefresh } from "@/app/app/_components/useRealtimeRefresh";

const PAGE_SIZE = 50;

export const dynamic = "force-dynamic";
export const metadata = { title: "Contracts" };

const STATUS_TONE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-50 text-blue-700",
  signed: "bg-emerald-50 text-emerald-700",
  void: "bg-rose-50 text-rose-700",
};
const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  signed: "Signed",
  void: "Void",
};
const FILTER_STATUSES = ["draft", "sent", "signed", "void"] as const;
type FilterStatus = (typeof FILTER_STATUSES)[number];

type Props = {
  searchParams: Promise<{ status?: string; page?: string }>;
};

export default async function ContractsPage({ searchParams }: Props) {
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
            {active
              ? `${items.length} of ${totalAll} · filtered by ${STATUS_LABELS[active]}`
              : `${totalAll} total`}
          </p>
        </header>

        <RealtimeRefresh tables={["contracts"]} />
        <FilterChips
          basePath="/app/contracts"
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
                ? `Nothing in the “${STATUS_LABELS[active]}” bucket`
                : "No contracts yet"
            }
            description={
              active
                ? "Try a different status — or clear the filter."
                : "Open a booking detail page and click “Create / open contract” to start one."
            }
            secondary={
              active
                ? { label: "All contracts", href: "/app/contracts" }
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
                  href={`/app/contracts/${c.id}`}
                  className="grid grid-cols-1 items-start gap-y-1 gap-x-4 px-5 py-4 sm:grid-cols-[1fr_140px_100px] sm:items-center"
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
                    {STATUS_LABELS[c.status] ?? c.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <Pagination
          basePath="/app/contracts"
          page={page}
          pageSize={PAGE_SIZE}
          totalCount={count ?? items.length}
          searchParams={{ status: active ?? undefined }}
        />
      </div>
    </AppShell>
  );
}
