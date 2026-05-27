import Link from "next/link";
import { AppShell } from "@/app/components/app/AppShell";
import { listAdminEvents } from "@/app/lib/goga/admin-events";
import { EmptyState, Icon } from "@/app/app/_components/EmptyState";
import { Pagination, parsePage } from "@/app/app/_components/Pagination";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit" };

const PAGE_SIZE = 50;

type Props = {
  searchParams: Promise<{
    page?: string;
    entityType?: string;
    entityId?: string;
    kind?: string;
  }>;
};

/** Monochrome event tones — three tiers communicate consequence:
 *  - terminal good (paid, signed, published)  → filled ink chip
 *  - in-flight     (sent, link_created, etc.) → outlined chip
 *  - terminal bad  (failed, deleted, void)    → struck-through grey
 *  - neutral       (everything else)          → flat grey chip
 */
const KIND_TONE: Array<{ test: RegExp; cls: string }> = [
  {
    test: /^deposit\.paid$|^contract\.signed$|\.published$/,
    cls: "bg-slate-900 text-white",
  },
  {
    test: /^deposit\.failed$|^booking\.deleted$|^contract\.voided$|^lead\.archived$/,
    cls: "bg-slate-100 text-slate-400 line-through",
  },
  {
    test: /^deposit\.|^contract\.sent$|^booking\.(created|status_changed)$|^lead\.stage_changed$/,
    cls: "bg-white text-slate-900 ring-1 ring-inset ring-black/15",
  },
];
function toneFor(kind: string): string {
  for (const t of KIND_TONE) if (t.test.test(kind)) return t.cls;
  return "bg-slate-100 text-slate-600";
}

function entityHref(t: string | null, id: string | null): string | null {
  if (!t || !id) return null;
  switch (t) {
    case "lead":
      return `/app/leads/${id}`;
    case "booking":
      return `/app/bookings/${id}`;
    case "contract":
      return `/app/contracts/${id}`;
    case "delivery":
      return `/app/deliveries/${id}`;
    case "package":
      return `/app/packages/${id}`;
    case "project":
      return `/app/projects/${id}`;
    case "service":
      return `/app/services/${id}`;
    default:
      return null;
  }
}

function describe(
  kind: string,
  payload: Record<string, unknown>,
): string | null {
  switch (kind) {
    case "lead.stage_changed":
      return `${payload.from ?? "—"} → ${payload.to ?? "—"}`;
    case "booking.status_changed":
      return `${payload.from ?? "—"} → ${payload.to ?? "—"}`;
    case "deposit.link_created":
      return `${payload.amount ?? "?"} ${payload.currency ?? ""}`;
    case "deposit.paid":
    case "deposit.failed":
    case "deposit.cancelled":
      return payload.payId
        ? `payId ${String(payload.payId).slice(0, 12)}…`
        : null;
    case "contract.sent":
      return payload.to ? `to ${payload.to}` : null;
    default:
      return null;
  }
}

export default async function AuditPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { page, from, to } = parsePage(sp.page, PAGE_SIZE);
  const { rows, count } = await listAdminEvents({
    offset: from,
    limit: to - from + 1,
    entityType: sp.entityType ?? null,
    entityId: sp.entityId ?? null,
    kind: sp.kind ?? null,
  });

  const filtered = !!(sp.entityType || sp.entityId || sp.kind);

  return (
    <AppShell
      breadcrumb={[{ label: "Audit" }]}
      chatScope={{ level: "tool", tool: "audit" }}
      chatScopeLabel="Audit"
    >
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
              Audit
            </h1>
            <p className="mt-1 text-[12px] uppercase tracking-[0.22em] text-[var(--ink-500)]">
              {count != null ? `${count} events` : "events"}
              {filtered ? " · filtered" : ""}
            </p>
          </div>
          {filtered ? (
            <Link
              href="/app/audit"
              className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-[var(--ink-700)] hover:bg-slate-50"
            >
              Clear filters
            </Link>
          ) : null}
        </header>

        {rows.length === 0 ? (
          <EmptyState
            icon={<Icon name="file" />}
            title={filtered ? "No events match these filters" : "No events yet"}
            description={
              filtered
                ? "Try clearing filters or pick a different entity / kind."
                : "Operator actions and payment outcomes will appear here as they happen."
            }
          />
        ) : (
          <ol className="space-y-1">
            {rows.map((e) => {
              const href = entityHref(e.entity_type, e.entity_id);
              const sub = describe(e.kind, e.payload);
              return (
                <li
                  key={e.id}
                  className="grid grid-cols-[180px_1fr_auto] items-center gap-3 rounded-xl bg-white px-4 py-2.5 text-[13px] ring-1 ring-black/5"
                >
                  <time className="font-mono text-[11px] tabular-nums text-[var(--ink-500)]">
                    {new Date(e.created_at).toLocaleString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${toneFor(e.kind)}`}
                      >
                        {e.kind}
                      </span>
                      {href ? (
                        <Link
                          href={href}
                          className="truncate text-[12px] text-[var(--ink-700)] hover:underline"
                        >
                          {e.entity_type}/{e.entity_id?.slice(0, 8)}…
                        </Link>
                      ) : e.entity_type ? (
                        <span className="text-[12px] text-[var(--ink-500)]">
                          {e.entity_type}
                        </span>
                      ) : null}
                      {sub ? (
                        <span className="text-[12px] text-[var(--ink-500)]">
                          {sub}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <span className="text-[11px] text-[var(--ink-400)]">
                    {e.actor ?? "system"}
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        <Pagination
          basePath="/app/audit"
          page={page}
          pageSize={PAGE_SIZE}
          totalCount={count ?? rows.length}
          searchParams={{
            entityType: sp.entityType,
            entityId: sp.entityId,
            kind: sp.kind,
          }}
        />
      </div>
    </AppShell>
  );
}
