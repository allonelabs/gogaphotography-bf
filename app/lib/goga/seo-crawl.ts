// app/lib/goga/seo-crawl.ts
//
// Turns live pages into the PageFacts that seo-score.ts grades. Kept apart from
// the scorer so the scoring rules stay testable without a network.
//
// Deliberately regex-based rather than a DOM parser: this reads a handful of
// head tags from static HTML, and pulling in a parser to do it would be a
// dependency for no gain. The tradeoff is that pathological markup can fool it,
// which is acceptable for a site we control and publish ourselves.

import { scorePage, type PageFacts, type SeoResult } from "./seo-score";

/** Cap on pages fetched per run, so a runaway sitemap cannot spend the whole
 *  request budget. The site is ~120 pages today. */
const MAX_URLS = 200;
/** Simultaneous fetches. Low on purpose - this points at production. */
const CONCURRENCY = 4;
const FETCH_TIMEOUT_MS = 15_000;

function attr(html: string, re: RegExp): string | null {
  const m = html.match(re);
  return m && m[1] ? m[1].trim() : null;
}

/** Strip script, style and tags to get something close to visible copy. */
function visibleText(html: string): string {
  return html
    .replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parsePage(url: string, html: string, focusKeyword?: string | null): PageFacts {
  const imgs = html.match(/<img\b[^>]*>/gi) ?? [];
  // Two ways for an image to be correct, not one.
  //
  // Real alt text is the usual answer. But WCAG 1.1.1 requires a *decorative*
  // image to carry an empty alt so assistive tech skips it, and an author who
  // has said so explicitly - aria-hidden or role="presentation" - has done the
  // right thing. Counting those as failures would push whoever is reading this
  // report toward describing spacer graphics, which makes a screen reader read
  // out noise. So the check is "handled", not "has words".
  const described = (t: string) => /\balt\s*=\s*["'][^"']+["']/i.test(t);
  const decorative = (t: string) =>
    /\balt\s*=\s*["']["']/i.test(t) &&
    /\baria-hidden\s*=\s*["']true["']|\brole\s*=\s*["']presentation["']|\brole\s*=\s*["']none["']/i.test(t);
  // A tag still holding a JavaScript expression - alt="'+altFor(im)+'" - is a
  // template inside a script, not an image on the page. This reads raw HTML and
  // cannot run the script, so counting it would report a permanent failure for
  // an image that is correctly described the moment a browser renders it.
  const template = (t: string) => /['"]\s*\+|\+\s*['"]|\$\{/.test(t);
  const real = imgs.filter((t) => !template(t));
  const withAlt = real.filter((t) => described(t) || decorative(t)).length;

  return {
    url,
    title: attr(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
    description: attr(html, /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i),
    canonical: attr(html, /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']*)["']/i),
    body: visibleText(html).slice(0, 5000),
    focusKeyword: focusKeyword ?? null,
    hasOpenGraph: /<meta[^>]+property=["']og:(title|image|description)["']/i.test(html),
    hasTwitterCard: /<meta[^>]+name=["']twitter:/i.test(html),
    hasSchema: /<script[^>]+type=["']application\/ld\+json["']/i.test(html),
    imgCount: real.length,
    imgWithAlt: withAlt,
  };
}

export function parseSitemap(xml: string, limit = MAX_URLS): string[] {
  const urls = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]!);
  return [...new Set(urls)].slice(0, limit);
}

async function fetchText(url: string): Promise<string | null> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: ctl.signal, redirect: "follow" });
    if (!r.ok) return null;
    return await r.text();
  } catch {
    // A page that will not load is reported as unreachable rather than crashing
    // the whole audit - one dead URL should not lose the other 119 results.
    return null;
  } finally {
    clearTimeout(t);
  }
}

export interface CrawlRow extends SeoResult {
  ok: boolean;
}

/** Fetch and score every URL in the sitemap, worst score first. */
export async function crawlSite(
  sitemapUrl: string,
  opts: { origin?: string } = {},
): Promise<CrawlRow[]> {
  const xml = await fetchText(sitemapUrl);
  if (!xml) return [];
  let urls = parseSitemap(xml);

  // The published sitemap still lists the old WordPress domain. Rewrite onto
  // the origin actually being audited, or every row would score the live site's
  // pages by fetching someone else's.
  if (opts.origin) {
    const origin = opts.origin.replace(/\/+$/, "");
    urls = urls.map((u) => {
      try {
        const p = new URL(u);
        return origin + p.pathname + p.search;
      } catch {
        return u;
      }
    });
    urls = [...new Set(urls)];
  }

  const out: CrawlRow[] = [];
  let cursor = 0;
  const worker = async () => {
    while (cursor < urls.length) {
      const url = urls[cursor++]!;
      const html = await fetchText(url);
      if (!html) {
        out.push({ url, score: 0, checks: [], failures: 0, ok: false });
        continue;
      }
      out.push({ ...scorePage(parsePage(url, html)), ok: true });
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  return out.sort((a, b) => a.score - b.score);
}
