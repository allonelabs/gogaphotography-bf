import Link from "next/link";
import { AppShell } from "@/app/components/app/AppShell";
import {
  AreaChart,
  BarList,
  Card,
  DonutSplit,
  Sparkline,
  type Point,
} from "@/app/components/app/Charts";
import {
  getTotals,
  getBreakdown,
  getDaily,
  errorMessage,
  type AnalyticsError,
} from "@/app/lib/goga/analytics";
import { getServerTr, getServerLocale } from "@/app/lib/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analytics" };

const RANGES = [7, 14, 30] as const;

/** Prettier axis label than a raw ISO date. */
function dayLabel(iso: string, dateLocale: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(dateLocale, { day: "numeric", month: "short" });
}

/** Page paths read better without the origin; "/" is worth naming. */
function pathLabel(p: string, tr: (en: string, ka: string) => string): string {
  if (!p || p === "/") return tr("Home", "მთავარი");
  return p.replace(/\/$/, "");
}

function Stat({
  label,
  value,
  hint,
  spark,
}: {
  label: string;
  value: number;
  hint: string;
  spark?: number[];
}) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
      <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--ink-500)]">
        {label}
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div
          className="font-mono text-[26px] tabular-nums leading-none text-[var(--ink-900)]"
          style={{ fontVariationSettings: '"wght" 540, "opsz" 36' }}
        >
          {value.toLocaleString()}
        </div>
        {spark && spark.length > 1 ? (
          <Sparkline values={spark} label={`${label} trend over the period`} />
        ) : null}
      </div>
      <div className="mt-1.5 text-[11px] text-[var(--ink-500)]">{hint}</div>
    </div>
  );
}

function NotConnected({
  error,
  tr,
}: {
  error: AnalyticsError;
  tr: (en: string, ka: string) => string;
}) {
  const actionable =
    error.kind === "unconfigured" || error.kind === "not_enabled";
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
      <h2 className="text-[13px] font-medium text-[var(--ink-900)]">
        {tr(
          "Traffic data is not flowing yet",
          "ტრაფიკის მონაცემები ჯერ არ მოდის",
        )}
      </h2>
      <p className="mt-1 max-w-prose text-[13px] text-[var(--ink-500)]">
        {errorMessage(error)}
      </p>
      {actionable ? (
        <ol className="mt-4 max-w-prose list-decimal space-y-1.5 pl-5 text-[13px] text-[var(--ink-500)]">
          <li>
            {tr("Turn on", "ჩართე")}{" "}
            <strong className="text-[var(--ink-900)]">Web Analytics</strong>{" "}
            {tr(
              "for the site project in Vercel. It is a dashboard switch, with no API to do it from here.",
              "საიტის პროექტისთვის Vercel-ში. ეს არის დაშბორდის გადამრთველი — აქედან API არ არსებობს.",
            )}
          </li>
          <li>
            {tr(
              "Create a team-scoped access token and set",
              "შექმენი გუნდის წვდომის ტოკენი და დააყენე",
            )}{" "}
            <code className="font-mono text-[12px]">VERCEL_TOKEN</code>{" "}
            {tr(
              "on this project. The project and team IDs are already set.",
              "ამ პროექტზე. პროექტის და გუნდის ID-ები უკვე დაყენებულია.",
            )}
          </li>
          <li>
            {tr(
              "Redeploy. Figures appear once real visitors arrive.",
              "თავიდან დეპლოი. მონაცემები გამოჩნდება რეალური სტუმრების მოსვლისთანავე.",
            )}
          </li>
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
  const tr = await getServerTr();
  const locale = await getServerLocale();
  const dateLocale = locale === "ka" ? "ka-GE" : "en-US";
  const requested = Number(sp.days);
  const days = RANGES.includes(requested as (typeof RANGES)[number])
    ? requested
    : 7;

  const [totals, daily, countries, pages, referrers, devices] =
    await Promise.all([
      getTotals(days),
      getDaily(days),
      getBreakdown("country", days),
      getBreakdown("requestPath", days),
      getBreakdown("referrerHostname", days),
      getBreakdown("deviceType", days),
    ]);

  const series: Point[] = daily.ok
    ? daily.data.map((d) => ({
        label: dayLabel(d.key, dateLocale),
        value: d.pageviews,
        secondary: d.visitors,
      }))
    : [];

  const toPoints = (
    r: typeof countries,
    map: (k: string) => string = (k) => k,
  ): Point[] =>
    r.ok ? r.data.map((d) => ({ label: map(d.key), value: d.pageviews })) : [];

  return (
    <AppShell
      breadcrumb={[
        { label: tr("Site", "საიტი") },
        { label: tr("Analytics", "ანალიტიკა") },
      ]}
      chatScope={{ level: "tool", tool: "analytics" }}
      chatScopeLabel={tr("Analytics", "ანალიტიკა")}
      chatStarters={[
        tr(
          "Which page got the most visits this week?",
          "რომელმა გვერდმა მიიღო ყველაზე მეტი ვიზიტი ამ კვირას?",
        ),
        tr(
          "Where are my visitors coming from?",
          "საიდან მოდიან ჩემი სტუმრები?",
        ),
        tr(
          "Are people finding the site on their phone?",
          "ხალხი საიტს ტელეფონით პოულობს?",
        ),
      ]}
    >
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1
              className="text-[var(--ink-900)]"
              style={{
                fontSize: "clamp(28px, 3.4vw, 40px)",
                fontWeight: 500,
                letterSpacing: "-0.022em",
                lineHeight: 1.05,
              }}
            >
              {tr("Analytics", "ანალიტიკა")}
            </h1>
            <p className="mt-1.5 text-[12px] uppercase tracking-[0.22em] text-[var(--ink-500)]">
              {tr("Who's visiting the site", "ვინ სტუმრობს საიტს")}
            </p>
          </div>
          <nav
            aria-label={tr("Date range", "თარიღის შუალედი")}
            className="flex gap-1 rounded-full bg-white p-1 ring-1 ring-black/5"
          >
            {RANGES.map((r) => {
              const active = r === days;
              return (
                <Link
                  key={r}
                  href={`/admin/analytics?days=${r}`}
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "rounded-full bg-[var(--ao-accent)] px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white"
                      : "rounded-full px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--ink-500)] transition-colors hover:bg-[var(--bg-sunken)] hover:text-[var(--ink-900)]"
                  }
                >
                  {r}d
                </Link>
              );
            })}
          </nav>
        </header>

        {!totals.ok ? (
          <NotConnected error={totals.error} tr={tr} />
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label={tr("Visitors", "სტუმრები")}
                value={totals.data.visitors}
                hint={tr(
                  `unique people, last ${days} days`,
                  `უნიკალური ადამიანი, ბოლო ${days} დღე`,
                )}
                spark={series.map((p) => p.secondary ?? 0)}
              />
              <Stat
                label={tr("Page views", "გვერდის ნახვები")}
                value={totals.data.pageviews}
                hint={tr(
                  `pages opened, last ${days} days`,
                  `გახსნილი გვერდი, ბოლო ${days} დღე`,
                )}
                spark={series.map((p) => p.value)}
              />
              <Stat
                label={tr("Views per visitor", "ნახვა თითო სტუმარზე")}
                value={
                  totals.data.visitors > 0
                    ? Math.round(
                        (totals.data.pageviews / totals.data.visitors) * 10,
                      ) / 10
                    : 0
                }
                hint={tr("how deep people go", "რამდენად ღრმად შედიან")}
              />
              <Stat
                label={tr("Busiest day", "ყველაზე დატვირთული დღე")}
                value={
                  series.length ? Math.max(...series.map((p) => p.value)) : 0
                }
                hint={
                  series.length
                    ? (series.find(
                        (p) =>
                          p.value === Math.max(...series.map((q) => q.value)),
                      )?.label ?? "—")
                    : tr("no data yet", "ჯერ არ არის მონაცემი")
                }
              />
            </section>

            <Card
              title={tr("Traffic", "ტრაფიკი")}
              hint={tr(
                `page views per day, last ${days} days`,
                `გვერდის ნახვები დღეში, ბოლო ${days} დღე`,
              )}
            >
              <AreaChart
                points={series}
                label={tr("Page views", "გვერდის ნახვები")}
              />
            </Card>

            <div className="grid gap-3 lg:grid-cols-2">
              <Card
                title={tr("Top pages", "საუკეთესო გვერდები")}
                hint={tr("what people actually open", "რას ხსნიან რეალურად")}
              >
                <BarList
                  points={toPoints(pages, (p) => pathLabel(p, tr))}
                  empty={tr(
                    "No page data yet.",
                    "ჯერ არ არის გვერდის მონაცემები.",
                  )}
                />
              </Card>
              <Card
                title={tr("Countries", "ქვეყნები")}
                hint={tr("where visitors are", "საიდან არიან სტუმრები")}
              >
                <BarList
                  points={toPoints(countries)}
                  empty={tr(
                    "No country data yet.",
                    "ჯერ არ არის ქვეყნის მონაცემები.",
                  )}
                />
              </Card>
              <Card
                title={tr("Referrers", "წყაროები")}
                hint={tr("how they found the site", "როგორ იპოვეს საიტი")}
              >
                <BarList
                  points={toPoints(referrers)}
                  empty={tr(
                    "Nothing yet. Visits typed straight into the address bar show up as direct, not here.",
                    "ჯერ არაფერია. პირდაპირ მისამართის ველში აკრეფილი ვიზიტები აქ არ ჩანს — ისინი პირდაპირია.",
                  )}
                />
              </Card>
              <Card
                title={tr("Devices", "მოწყობილობები")}
                hint={tr("phone against desktop", "ტელეფონი vs. კომპიუტერი")}
              >
                <DonutSplit points={toPoints(devices)} />
              </Card>
            </div>

            <p className="max-w-prose text-[11px] leading-relaxed text-[var(--ink-500)]">
              {tr(
                "Visitors are counted from a hash of each request that resets every day, so there are no cookies and no consent banner, and the same person on two days counts twice. These figures are totals by page, country and device. They cannot tell you which named person visited, and nothing here identifies anyone.",
                "სტუმრები ითვლება თითოეული მოთხოვნის ჰეშით, რომელიც ყოველდღე განახლდება — ამიტომ არ არის ქუქი-ფაილები და თანხმობის ბანერი, ხოლო ერთი და იგივე ადამიანი ორ დღეში ორჯერ ითვლება. ეს მაჩვენებლები არის ჯამები გვერდის, ქვეყნისა და მოწყობილობის მიხედვით. მათგან ვერ გაიგებთ, კონკრეტულად ვინ ეწვია საიტს — აქ არავინ არ არის იდენტიფიცირებული.",
              )}
            </p>
          </>
        )}
      </div>
    </AppShell>
  );
}
