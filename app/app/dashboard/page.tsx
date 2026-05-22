import { AppShell } from "@/app/components/app/AppShell";
import { createOrgScopedSupabaseClient } from "@/app/lib/supabase/with-org";
import { getServerT } from "@/app/lib/i18n/server";
import Link from "next/link";
import {
  Building,
  Receipt,
  Wallet,
  ScrollText,
  Plane,
  Truck,
  UserCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface DashboardStats {
  totalHotels: number;
  totalOrders: number;
  ordersToday: number;
  outstandingHotels: number;
  totalAvia: number;
  totalTransfer: number;
  totalGuides: number;
  recentActivity: Array<{
    id: number;
    actor_email: string | null;
    action: string;
    table_name: string;
    occurred_at: string;
  }>;
}

async function loadStats(): Promise<DashboardStats> {
  // `db/types.ts` is hand-rolled and predates multi-tenancy + the computed-view
  // migrations; existing routes cast through `any` to access org_id + views.
  const { client, orgId } = await createOrgScopedSupabaseClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = client as any;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  // Count queries — `.eq("organization_id", orgId)` enforced even though
  // our service client + RLS guard duplicate this; cheap defense in depth.
  const [hotels, orders, ordersTodayResp, avia, transfer, guides] =
    await Promise.all([
      sb
        .from("hotel")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId),
      sb
        .from("p_order")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId),
      sb
        .from("p_order")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .gte("created_at", todayIso),
      sb
        .from("avia")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId),
      sb
        .from("transfer")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId),
      sb
        .from("guide")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId),
    ] as unknown as Promise<{ count: number | null }>[]);

  // Outstanding-balance hotels — uses the hotel_balance_computed view from migration 0005
  const { data: outstandingRows } = (await sb
    .from("hotel_balance_computed")
    .select("hotel_id, balance")
    .gt("balance", 0)) as unknown as { data: unknown[] | null };

  // Recent audit log entries (last 10)
  const { data: auditRows } = (await sb
    .from("audit_log")
    .select("id, actor_email, action, table_name, occurred_at")
    .order("occurred_at", { ascending: false })
    .limit(10)) as unknown as { data: DashboardStats["recentActivity"] | null };

  return {
    totalHotels: hotels.count ?? 0,
    totalOrders: orders.count ?? 0,
    ordersToday: ordersTodayResp.count ?? 0,
    outstandingHotels: outstandingRows?.length ?? 0,
    totalAvia: avia.count ?? 0,
    totalTransfer: transfer.count ?? 0,
    totalGuides: guides.count ?? 0,
    recentActivity: auditRows ?? [],
  };
}

function StatCard({
  icon,
  label,
  value,
  href,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  href?: string;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const toneClass =
    tone === "good"
      ? "border-emerald-300/40 bg-emerald-50/40"
      : tone === "warn"
        ? "border-amber-300/40 bg-amber-50/40"
        : tone === "bad"
          ? "border-rose-300/40 bg-rose-50/40"
          : "border-[var(--allonce-line)] bg-[var(--bg-surface)]";

  const inner = (
    <div
      className={`flex flex-col gap-3 rounded-[var(--radius-md)] border ${toneClass} p-4 shadow-[var(--shadow-xs)] transition hover:shadow-[var(--shadow-md)]`}
    >
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-white/70 text-[var(--ink-700)]">
          {icon}
        </div>
        {href && (
          <span className="text-[var(--ink-400)] transition group-hover:text-[var(--ink-700)]">
            →
          </span>
        )}
      </div>
      <div>
        <div className="text-3xl font-semibold tracking-[-0.02em] text-[var(--ink-900)] tabular-nums">
          {value}
        </div>
        <div className="text-[12px] text-[var(--ink-500)]">{label}</div>
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="group block">
      {inner}
    </Link>
  ) : (
    inner
  );
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default async function DashboardPage() {
  const t = await getServerT();
  const stats = await loadStats();

  return (
    <AppShell
      breadcrumb={[{ label: t("nav.dashboard") }]}
      chatScope={{ level: "org", org: "travelplace" }}
      chatScopeLabel="Dashboard"
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
            {t("dashboard.title")}
          </h1>
          <p className="mt-1 text-[13px] text-[var(--ink-500)]">
            {t("dashboard.subtitle")}
          </p>
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <StatCard
            icon={<Building className="h-4 w-4" strokeWidth={1.75} />}
            label={t("dashboard.stat.hotels")}
            value={stats.totalHotels}
            href="/app/hotels"
          />
          <StatCard
            icon={<Receipt className="h-4 w-4" strokeWidth={1.75} />}
            label={t("dashboard.stat.orders_today")}
            value={stats.ordersToday}
            href="/app/orders"
            tone={stats.ordersToday > 0 ? "good" : "default"}
          />
          <StatCard
            icon={<Wallet className="h-4 w-4" strokeWidth={1.75} />}
            label={t("dashboard.stat.outstanding")}
            value={stats.outstandingHotels}
            tone={stats.outstandingHotels > 0 ? "warn" : "default"}
          />
          <StatCard
            icon={<Receipt className="h-4 w-4" strokeWidth={1.75} />}
            label={t("dashboard.stat.total_orders")}
            value={stats.totalOrders}
            href="/app/orders"
          />
          <StatCard
            icon={<Plane className="h-4 w-4" strokeWidth={1.75} />}
            label={t("dashboard.stat.avia")}
            value={stats.totalAvia}
            href="/app/avia"
          />
          <StatCard
            icon={<Truck className="h-4 w-4" strokeWidth={1.75} />}
            label={t("dashboard.stat.transfer")}
            value={stats.totalTransfer}
            href="/app/transfers"
          />
          <StatCard
            icon={<UserCheck className="h-4 w-4" strokeWidth={1.75} />}
            label={t("dashboard.stat.guides")}
            value={stats.totalGuides}
            href="/app/guides"
          />
        </div>

        {/* Recent activity */}
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[var(--ink-500)]">
              <ScrollText
                className="mr-2 inline h-3.5 w-3.5"
                strokeWidth={1.75}
              />
              {t("dashboard.recent_activity")}
            </h2>
            <Link
              href="/app/audit"
              className="text-[12px] text-[var(--ink-500)] hover:text-[var(--ink-900)]"
            >
              {t("dashboard.view_all")} →
            </Link>
          </div>
          {stats.recentActivity.length === 0 ? (
            <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--allonce-line)] bg-[var(--bg-surface)] p-6 text-center text-[13px] text-[var(--ink-500)]">
              {t("dashboard.no_activity")}
            </div>
          ) : (
            <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--allonce-line)] bg-[var(--bg-surface)] shadow-[var(--shadow-xs)]">
              <ul>
                {stats.recentActivity.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center gap-3 border-b border-[var(--allonce-line)] px-4 py-2.5 text-[13px] last:border-b-0"
                  >
                    <span
                      className={`inline-flex h-5 items-center rounded-full px-2 font-mono text-[10px] uppercase tracking-wider ${
                        row.action === "insert"
                          ? "bg-emerald-100/60 text-emerald-900"
                          : row.action === "update"
                            ? "bg-sky-100/60 text-sky-900"
                            : "bg-rose-100/60 text-rose-900"
                      }`}
                    >
                      {row.action}
                    </span>
                    <span className="font-mono text-[12px] text-[var(--ink-700)]">
                      {row.table_name}
                    </span>
                    <span className="flex-1 truncate text-[var(--ink-500)]">
                      {row.actor_email ?? "system"}
                    </span>
                    <span className="text-[11px] tabular-nums text-[var(--ink-400)]">
                      {relativeTime(row.occurred_at)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
