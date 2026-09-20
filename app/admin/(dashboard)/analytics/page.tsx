import { AppShell } from "@/app/components/app/AppShell";
import {
  getTotals,
  getBreakdown,
  getDaily,
  errorMessage,
  MAX_RANGE_DAYS,
  type AnalyticsError,
  type Breakdown,
} from "@/app/lib/goga/analytics";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analytics" };

const RANGES = [7, 14, 30] as const;

function Panel({
  title,
  subtitle,
  rows,
  empty,
}: {
  title: string;
  subtitle: string;
  rows: Breakdown[];
  empty: string;
}) {
  const top = rows[0]?.pageviews ?? 0;
  return (
    <section className="rounded-lg border border-[var(--line-200)] p-4">
      <header className="mb-3">
        <h2 className="text-[13px] font-semibold text-[var(--ink-900)]">{title}</h2>
        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--ink-500)]">
          {subtitle}
        </p>
      </header>
      {rows.length === 0 ? (
        <p className="text-[13px] text-[var(--ink-500)]">{empty}</p>
      ) : (
        <ol className="space-y-2">
          {rows.map((r) => (
            <li key={r.key} className="text-[13px]">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-[var(--ink-900)]" title={r.key}>
                  {r.key || "—"}
                </span>
                <span className="shrink-0 tabular-nums text-[var(--ink-500)]">
                  {r.pageviews.toLocaleString()}
                </span>
              </div>
              {/* Bar width is relative to the top row, so the shape of the
                  distribution is readable without axes. */}
              <div className="mt-1 h-1 rounded bg-[var(--line-200)]">
                <div
                  className="h-1 rounded bg-[var(--ink-900)]"
                  style={{ width: top > 0 ? `${Math.max(2, (r.pageviews / top) * 100)}%` : "0%" }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function NotConnected({ error }: { error: AnalyticsError }) {
  return (
    <div className="rounded-lg border border-[var(--line-200)] p-5">
      <h2 className="text-[13px] font-semibold text-[var(--ink-900)]">
        Traffic data is not flowing yet
      </h2>
      <p className="mt-1 max-w-prose text-[13px] text-[var(--ink-500)]">
        {errorMessage(error)}
      </p>
      {error.kind === "unconfigured" || error.kind === "not_enabled" ? (
        <ol className="mt-4 max-w-prose list-decimal space-y-1.5 pl-5 text-[13px] text-[var(--ink-500)]">
          <li>
            Enable <strong>Web Analytics</strong> on the{" "}
            <code className="text-[12px]">gogaphotography</code> project in Vercel.
          </li>
          <li>
            Create a team-scoped access token and set <code className="text-[12px]">VERCEL_TOKEN</code>,{" "}
            <code className="text-[12px]">VERCEL_PROJECT_ID</code> and{" "}
            <code className="text-[12px]">VERCEL_TEAM_ID</code> on this project.
          </li>
          <li>Redeploy. Figures appear once real visitors arrive.</li>
        </ol>
      ) : null}
    </div>
  );
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const sp = await searchParams;
  const requested = Number(sp.days);
  const days = RANGES.includes(requested as (typeof RANGES)[number]) ? requested : 7;

  const [totals, daily, countries, pages, referrers, devices] = await Promise.all([
    getTotals(days),
    getDaily(days),
    getBreakdown("country", days),
    getBreakdown("requestPath", days),
    getBreakdown("referrerHostname", days),
    getBreakdown("deviceType", days),
  ]);

  const peak = daily.ok ? Math.max(1, ...daily.data.map((d) => d.pageviews)) : 1;

  return (
    <AppShell
      breadcrumb={[{ label: "Site" }, { label: "Analytics" }]}
      chatScope={{ level: "tool", tool: "analytics" }}
      chatScopeLabel="Analytics"
    >
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
              Analytics
            </h1>
            <p className="mt-1 text-[12px] uppercase tracking-[0.22em] text-[var(--ink-500)]">
              ვინ სტუმრობს საიტს · who visits the site
            </p>
          </div>
          <nav className="flex gap-1" aria-label="Date range">
            {RANGES.map((r) => (
              <a
                key={r}
                href={`/admin/analytics?days=${r}`}
                aria-current={r === days ? "true" : undefined}
                className={
                  r === days
                    ? "rounded-full bg-[var(--ink-900)] px-3 py-1 text-[12px] text-white"
                    : "rounded-full border border-[var(--line-200)] px-3 py-1 text-[12px] text-[var(--ink-500)]"
                }
              >
                {r}d
              </a>
            ))}
          </nav>
        </header>

        {!totals.ok ? (
          <NotConnected error={totals.error} />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Visitors", totals.data.visitors, "unique people"],
                ["Page views", totals.data.pageviews, "pages opened"],
              ].map(([label, value, hint]) => (
                <div key={String(label)} className="rounded-lg border border-[var(--line-200)] p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--ink-500)]">
                    {label}
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--ink-900)]">
                    {Number(value).toLocaleString()}
                  </p>
                  <p className="text-[12px] text-[var(--ink-500)]">
                    {hint} · last {days} days
                  </p>
                </div>
              ))}
            </div>

            {daily.ok && daily.data.length > 0 ? (
              <section className="rounded-lg border border-[var(--line-200)] p-4">
                <h2 className="mb-3 text-[13px] font-semibold text-[var(--ink-900)]">
                  Daily page views
                </h2>
                <div className="flex h-28 items-end gap-1">
                  {daily.data.map((d) => (
                    <div
                      key={d.key}
                      title={`${d.key}: ${d.pageviews} views, ${d.visitors} visitors`}
                      className="flex-1 rounded-t bg-[var(--ink-900)]"
                      style={{ height: `${Math.max(2, (d.pageviews / peak) * 100)}%` }}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            <div className="grid gap-3 lg:grid-cols-2">
              <Panel
                title="Top pages"
                subtitle="most opened"
                rows={pages.ok ? pages.data : []}
                empty="No page data yet."
              />
              <Panel
                title="Countries"
                subtitle="where visitors are"
                rows={countries.ok ? countries.data : []}
                empty="No country data yet."
              />
              <Panel
                title="Referrers"
                subtitle="how they found the site"
                rows={referrers.ok ? referrers.data : []}
                empty="No referrer data yet — direct visits show nothing here."
              />
              <Panel
                title="Devices"
                subtitle="phone vs desktop"
                rows={devices.ok ? devices.data : []}
                empty="No device data yet."
              />
            </div>

            <p className="max-w-prose text-[12px] text-[var(--ink-500)]">
              Visitors are counted by a hash of the request that resets daily, not
              by a cookie — so there is no consent banner, and no individual can be
              identified or followed between days. The free plan keeps{" "}
              {MAX_RANGE_DAYS} days of history.
            </p>
          </>
        )}
      </div>
    </AppShell>
  );
}
