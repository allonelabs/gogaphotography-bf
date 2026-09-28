import Link from "next/link";
import { AppShell } from "@/app/components/app/AppShell";
import { Card, ScoreRing } from "@/app/components/app/Charts";
import { crawlSite, type CrawlRow } from "@/app/lib/goga/seo-crawl";
import { getServerTr } from "@/app/lib/i18n/server";

export const dynamic = "force-dynamic";
// The crawl fetches every page in the sitemap; give it room but keep a ceiling.
export const maxDuration = 60;
export const metadata = { title: "SEO" };

const SITE =
  process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "https://gogaphotography.vercel.app";

/** Three bands rather than a gradient - the colour is a verdict, and a verdict
 *  should not shift by one point. All three clear 4.5:1 on white. */
function tone(score: number): string {
  if (score >= 80) return "text-[#15803d]";
  if (score >= 50) return "text-[#b45309]";
  return "text-[#b91c1c]";
}

function verdict(
  score: number,
  tr: (en: string, ka: string) => string,
): string {
  if (score >= 80) return tr("Healthy", "კარგ მდგომარეობაშია");
  if (score >= 50) return tr("Needs work", "საჭიროებს გაუმჯობესებას");
  return tr("Losing ground", "უარესდება");
}

export default async function SeoPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const sp = await searchParams;
  const tr = await getServerTr();
  const rows = await crawlSite(`${SITE}/sitemap.xml`, { origin: SITE });
  const ok = rows.filter((r) => r.ok);
  const average =
    ok.length === 0
      ? 0
      : Math.round(ok.reduce((n, r) => n + r.score, 0) / ok.length);

  // Which checks fail most often - the fix list, ordered by how many pages each
  // repair would improve.
  const tally = new Map<
    string,
    { label: string; count: number; detail: string }
  >();
  for (const r of ok) {
    for (const c of r.checks) {
      if (c.pass) continue;
      const prev = tally.get(c.id);
      tally.set(c.id, {
        label: c.labelEn,
        count: (prev?.count ?? 0) + 1,
        detail: prev?.detail || c.detail,
      });
    }
  }
  const common = [...tally.values()].sort((a, b) => b.count - a.count);

  const selected: CrawlRow | undefined = sp.url
    ? ok.find((r) => r.url === sp.url)
    : undefined;

  const band = (n: number) =>
    ok.filter((r) => r.score >= n && r.score < n + 20).length;
  const distribution = [0, 20, 40, 60, 80].map((floor) => ({
    floor,
    count: band(floor),
  }));
  const widest = Math.max(1, ...distribution.map((d) => d.count));

  return (
    <AppShell
      breadcrumb={[{ label: tr("Site", "საიტი") }, { label: "SEO" }]}
      chatScope={{ level: "tool", tool: "seo" }}
      chatScopeLabel="SEO"
      chatStarters={[
        tr(
          "What is hurting my search ranking most?",
          "რა აზიანებს ყველაზე მეტად ჩემს საძიებო რანჟირებას?",
        ),
        tr(
          "Which pages need a better description?",
          "რომელ გვერდებს სჭირდება უკეთესი აღწერა?",
        ),
        tr(
          "Explain what a canonical tag does",
          "ახსენი, რას აკეთებს canonical თეგი",
        ),
      ]}
    >
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <header>
          <h1
            className="text-[var(--ink-900)]"
            style={{
              fontSize: "clamp(28px, 3.4vw, 40px)",
              fontWeight: 500,
              letterSpacing: "-0.022em",
              lineHeight: 1.05,
            }}
          >
            SEO
          </h1>
          <p className="mt-1.5 text-[12px] uppercase tracking-[0.22em] text-[var(--ink-500)]">
            {tr(
              `${ok.length} pages checked · ${common.length} kinds of issue`,
              `${ok.length} გვერდი შემოწმდა · ${common.length} სახის პრობლემა`,
            )}
          </p>
        </header>

        {ok.length === 0 ? (
          <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
            <p className="text-[13px] text-[var(--ink-500)]">
              {tr(
                `Could not read ${SITE}/sitemap.xml, so there is nothing to score.`,
                `${SITE}/sitemap.xml ვერ წაიკითხა, ამიტომ შესაფასებელი არაფერია.`,
              )}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 lg:grid-cols-[auto_1fr]">
              <Card
                title={tr("Site score", "საიტის ქულა")}
                hint={tr("average across every page", "საშუალო ყველა გვერდზე")}
              >
                <ScoreRing
                  score={average}
                  caption={tr(
                    `${verdict(average, tr)} · ${ok.length} pages`,
                    `${verdict(average, tr)} · ${ok.length} გვერდი`,
                  )}
                />
              </Card>

              <Card
                title={tr("How pages are doing", "როგორ არიან გვერდები")}
                hint={tr(
                  "pages per score band",
                  "გვერდები ქულის დიაპაზონის მიხედვით",
                )}
              >
                <ol className="space-y-2.5">
                  {distribution
                    .slice()
                    .reverse()
                    .map((d) => (
                      <li key={d.floor}>
                        <div className="flex items-baseline justify-between gap-3 text-[13px]">
                          <span className="tabular-nums text-[var(--ink-900)]">
                            {d.floor}–{d.floor + 19}
                          </span>
                          <span className="tabular-nums text-[var(--ink-500)]">
                            {tr(
                              `${d.count} ${d.count === 1 ? "page" : "pages"}`,
                              `${d.count} გვერდი`,
                            )}
                          </span>
                        </div>
                        <div
                          aria-hidden
                          className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--bg-sunken)]"
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(d.count / widest) * 100}%`,
                              background:
                                d.floor >= 80
                                  ? "#15803d"
                                  : d.floor >= 40
                                    ? "#b45309"
                                    : "#b91c1c",
                            }}
                          />
                        </div>
                      </li>
                    ))}
                </ol>
              </Card>
            </div>

            <Card
              title={tr("Fix these first", "ჯერ ეს გაასწორეთ")}
              hint={tr(
                "ordered by how many pages each repair would improve",
                "დალაგებულია იმის მიხედვით, რამდენ გვერდს გააუმჯობესებს თითოეული გასწორება",
              )}
            >
              <ol className="space-y-3">
                {common.map((c) => (
                  <li key={c.label}>
                    <div className="flex min-w-0 items-baseline justify-between gap-3 text-[13px]">
                      <span className="min-w-0 truncate font-medium text-[var(--ink-900)]">
                        {c.label}
                      </span>
                      <span className="shrink-0 tabular-nums text-[var(--ink-500)]">
                        {tr(
                          `${c.count} of ${ok.length}`,
                          `${c.count} / ${ok.length}`,
                        )}
                      </span>
                    </div>
                    <div
                      aria-hidden
                      className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--bg-sunken)]"
                    >
                      <div
                        className="h-full rounded-full bg-[#b91c1c]"
                        style={{ width: `${(c.count / ok.length) * 100}%` }}
                      />
                    </div>
                    {c.detail ? (
                      <p className="mt-1 text-[11px] text-[var(--ink-500)]">
                        {c.detail}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </Card>

            <Card
              title={tr("Worst pages", "ყველაზე ცუდი გვერდები")}
              hint={tr("lowest score first", "ჯერ ყველაზე დაბალი ქულა")}
            >
              <ol className="divide-y divide-black/5">
                {ok.slice(0, 20).map((r) => (
                  <li key={r.url}>
                    <Link
                      href={`/admin/seo?url=${encodeURIComponent(r.url)}`}
                      aria-current={
                        selected?.url === r.url ? "true" : undefined
                      }
                      className="flex min-w-0 items-baseline justify-between gap-3 rounded-lg px-2 py-2.5 text-[13px] transition-colors hover:bg-[var(--bg-sunken)]"
                    >
                      <span className="min-w-0 truncate text-[var(--ink-900)]">
                        {r.url.replace(SITE, "") || "/"}
                      </span>
                      <span
                        className={`shrink-0 font-mono tabular-nums ${tone(r.score)}`}
                      >
                        {r.score}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </Card>

            {selected ? (
              <Card
                title={selected.url.replace(SITE, "") || "/"}
                hint={tr(
                  `${selected.checks.filter((c) => c.pass).length} of ${selected.checks.length} checks passing`,
                  `${selected.checks.filter((c) => c.pass).length} / ${selected.checks.length} შემოწმება წარმატებულია`,
                )}
                action={
                  <span
                    className={`font-mono text-[22px] tabular-nums ${tone(selected.score)}`}
                  >
                    {selected.score}
                  </span>
                }
              >
                <ul className="space-y-2">
                  {selected.checks.map((c) => (
                    <li key={c.id} className="flex gap-2.5 text-[13px]">
                      {/* Shape as well as colour, so the pass/fail does not
                          depend on seeing green against red. */}
                      <span
                        aria-hidden
                        className={
                          c.pass
                            ? "mt-0.5 shrink-0 text-[#15803d]"
                            : "mt-0.5 shrink-0 text-[#b91c1c]"
                        }
                      >
                        {c.pass ? "✓" : "✕"}
                      </span>
                      <span>
                        <span className="text-[var(--ink-900)]">{c.label}</span>{" "}
                        <span className="tabular-nums text-[var(--ink-500)]">
                          {c.points}/{c.max}
                        </span>
                        <span className="sr-only">
                          {c.pass
                            ? tr(" passed", " წარმატებული")
                            : tr(" failed", " ჩავარდნილი")}
                        </span>
                        {!c.pass && c.detail ? (
                          <span className="mt-0.5 block text-[11px] text-[var(--ink-500)]">
                            {c.detail}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  );
}
