import Link from "next/link";
import { getServerTr } from "@/app/lib/i18n/server";

/**
 * URL-based pagination control. Renders prev / next + a compact
 * "page X of Y" indicator. Preserves all other query params so it
 * composes with FilterChips and ListSearch.
 *
 * Stateless and server-rendered — the page server reads ?page= and
 * passes the resolved numbers in.
 */
export async function Pagination({
  basePath,
  page,
  pageSize,
  totalCount,
  searchParams = {},
}: {
  basePath: string;
  page: number;
  pageSize: number;
  totalCount: number;
  /** Other query params to preserve (e.g. status, q). */
  searchParams?: Record<string, string | undefined>;
}) {
  const tr = await getServerTr();
  const lastPage = Math.max(1, Math.ceil(totalCount / pageSize));
  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  function hrefFor(p: number): string {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (v != null && v !== "") sp.set(k, v);
    }
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  if (lastPage <= 1 && totalCount <= pageSize) return null;

  const prev = page > 1 ? hrefFor(page - 1) : null;
  const next = page < lastPage ? hrefFor(page + 1) : null;

  const linkCls =
    "rounded-full border border-black/10 bg-white px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-[var(--ink-700)] transition hover:bg-slate-50";
  const disabledCls =
    "rounded-full border border-black/10 bg-white px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-[var(--ink-300)] cursor-not-allowed";

  return (
    <nav className="mt-4 flex items-center justify-between text-[12px] text-[var(--ink-500)]">
      <span className="tabular-nums">
        {totalCount === 0
          ? tr("0 results", "0 შედეგი")
          : tr(
              `${start}–${end} of ${totalCount}`,
              `${start}–${end} / ${totalCount}`,
            )}
      </span>
      <div className="flex items-center gap-1.5">
        {prev ? (
          <Link href={prev} className={linkCls} prefetch={false}>
            {tr("← Prev", "← წინა")}
          </Link>
        ) : (
          <span className={disabledCls}>{tr("← Prev", "← წინა")}</span>
        )}
        <span className="px-2 text-[var(--ink-500)] tabular-nums">
          {page} / {lastPage}
        </span>
        {next ? (
          <Link href={next} className={linkCls} prefetch={false}>
            {tr("Next →", "შემდეგი →")}
          </Link>
        ) : (
          <span className={disabledCls}>{tr("Next →", "შემდეგი →")}</span>
        )}
      </div>
    </nav>
  );
}

/**
 * Parse and clamp `?page=` from a server-side searchParams object.
 * Defaults to page 1 on missing/invalid input. Returns the offset/limit
 * pair ready to pass to PostgREST `.range()`.
 */
export function parsePage(
  raw: string | undefined,
  pageSize: number,
): { page: number; from: number; to: number } {
  const n = Number(raw);
  const page = Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return { page, from, to };
}
