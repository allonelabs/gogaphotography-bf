import { AppShell } from "@/app/components/app/AppShell";
import { crawlSite, type CrawlRow } from "@/app/lib/goga/seo-crawl";

export const dynamic = "force-dynamic";
// The crawl fetches every page in the sitemap; give it room but keep a ceiling.
export const maxDuration = 60;
export const metadata = { title: "SEO" };

const SITE =
  process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "https://gogaphotography.vercel.app";

function tone(score: number): string {
  if (score >= 80) return "text-emerald-700";
  if (score >= 50) return "text-amber-700";
  return "text-red-700";
}

export default async function SeoPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const sp = await searchParams;
  const rows = await crawlSite(`${SITE}/sitemap.xml`, { origin: SITE });
  const ok = rows.filter((r) => r.ok);
  const average =
    ok.length === 0 ? 0 : Math.round(ok.reduce((n, r) => n + r.score, 0) / ok.length);

  // Which checks fail most often across the site - the fix list, ordered by how
  // many pages each repair would improve.
  const tally = new Map<string, { label: string; count: number; detail: string }>();
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

  return (
    <AppShell
      breadcrumb={[{ label: "Site" }, { label: "SEO" }]}
      chatScope={{ level: "tool", tool: "seo" }}
      chatScopeLabel="SEO"
    >
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <header>
          <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
            SEO ანალიზი
          </h1>
          <p className="mt-1 text-[12px] uppercase tracking-[0.22em] text-[var(--ink-500)]">
            {ok.length} pages checked · {common.length} kinds of issue
          </p>
        </header>

        {ok.length === 0 ? (
          <p className="text-[13px] text-[var(--ink-500)]">
            Could not read {SITE}/sitemap.xml — nothing to score.
          </p>
        ) : (
          <>
            <div className="rounded-lg border border-[var(--line-200)] p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--ink-500)]">
                Site average
              </p>
              <p className={`mt-1 text-4xl font-semibold tabular-nums ${tone(average)}`}>
                {average}
                <span className="text-lg text-[var(--ink-500)]">/100</span>
              </p>
            </div>

            <section>
              <h2 className="mb-2 text-[13px] font-semibold text-[var(--ink-900)]">
                Fix these first
              </h2>
              <p className="mb-3 max-w-prose text-[12px] text-[var(--ink-500)]">
                Ordered by how many pages each repair would improve.
              </p>
              <ul className="space-y-2">
                {common.map((c) => (
                  <li
                    key={c.label}
                    className="rounded-lg border border-[var(--line-200)] p-3 text-[13px]"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-medium text-[var(--ink-900)]">{c.label}</span>
                      <span className="shrink-0 tabular-nums text-[var(--ink-500)]">
                        {c.count} of {ok.length} pages
                      </span>
                    </div>
                    {c.detail ? (
                      <p className="mt-1 text-[12px] text-[var(--ink-500)]">{c.detail}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-[13px] font-semibold text-[var(--ink-900)]">
                Worst pages
              </h2>
              <ul className="divide-y divide-[var(--line-200)] rounded-lg border border-[var(--line-200)]">
                {ok.slice(0, 20).map((r) => (
                  <li key={r.url}>
                    <a
                      href={`/admin/seo?url=${encodeURIComponent(r.url)}`}
                      className="flex items-baseline justify-between gap-3 p-3 text-[13px] hover:bg-[var(--line-100)]"
                    >
                      <span className="truncate text-[var(--ink-900)]">
                        {r.url.replace(SITE, "") || "/"}
                      </span>
                      <span className={`shrink-0 tabular-nums font-medium ${tone(r.score)}`}>
                        {r.score}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>

            {selected ? (
              <section className="rounded-lg border border-[var(--line-200)] p-4">
                <h2 className="text-[13px] font-semibold text-[var(--ink-900)]">
                  {selected.url.replace(SITE, "") || "/"}
                </h2>
                <p className={`mb-3 text-2xl font-semibold tabular-nums ${tone(selected.score)}`}>
                  {selected.score}/100
                </p>
                <ul className="space-y-1.5">
                  {selected.checks.map((c) => (
                    <li key={c.id} className="flex gap-2 text-[13px]">
                      <span aria-hidden className={c.pass ? "text-emerald-700" : "text-red-700"}>
                        {c.pass ? "✓" : "✕"}
                      </span>
                      <span>
                        <span className="text-[var(--ink-900)]">{c.label}</span>{" "}
                        <span className="text-[var(--ink-500)]">
                          {c.points}/{c.max}
                        </span>
                        {!c.pass && c.detail ? (
                          <span className="block text-[12px] text-[var(--ink-500)]">
                            {c.detail}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  );
}
