// URL fetcher used by the chat `fetch_url` tool.
// SSRF-protected (refuses private/loopback hosts), size-capped at 4 MB,
// 15 s timeout, strips scripts/styles, extracts <title>, <description>,
// og:image so the model gets a clean summary instead of raw HTML.
// Ported from BF (shell-zone/app/lib/chat-tools.ts) — self-contained.

export interface FetchUrlResult {
  url: string;
  finalUrl: string;
  status: number;
  contentType: string;
  title: string;
  description: string;
  ogImage: string;
  text: string;
  truncated: boolean;
  elapsedMs: number;
}

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase();
  if (
    h === "localhost" ||
    h === "0.0.0.0" ||
    h.endsWith(".local") ||
    h.endsWith(".localhost") ||
    h.endsWith(".internal")
  )
    return true;
  if (/^127\./.test(h)) return true;
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (/^::1$|^fc|^fd|^fe80/i.test(h)) return true;
  return false;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
      String.fromCharCode(parseInt(n, 16)),
    );
}

export async function fetchUrlReadable(
  url: string,
): Promise<{ ok: true; data: FetchUrlResult } | { ok: false; error: string }> {
  if (!url) return { ok: false, error: "url required" };
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: `invalid URL "${url}"` };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: `only http(s) — got "${parsed.protocol}"` };
  }
  if (isPrivateHost(parsed.hostname)) {
    return {
      ok: false,
      error: `refusing private/loopback host "${parsed.hostname}"`,
    };
  }
  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15 TravelplaceBot/1.0",
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.9,*/*;q=0.5",
        "accept-language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) {
    return {
      ok: false,
      error: `network error — ${e instanceof Error ? e.message : String(e)}`,
    };
  }
  if (!res.ok) {
    return { ok: false, error: `${res.status} ${res.statusText}` };
  }
  const ct = (res.headers.get("content-type") ?? "").toLowerCase();
  const bytes = await res.arrayBuffer();
  if (bytes.byteLength > 4_000_000) {
    return {
      ok: false,
      error: `response too large (${(bytes.byteLength / 1024 / 1024).toFixed(1)}MB)`,
    };
  }
  const raw = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  let text = raw;
  let title = "";
  let description = "";
  let ogImage = "";
  if (ct.includes("text/html") || /<html[\s>]/i.test(raw)) {
    const titleMatch = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    title = titleMatch
      ? decodeEntities(titleMatch[1].replace(/\s+/g, " ").trim())
      : "";
    const ogTitle = raw.match(
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    );
    if (ogTitle && !title) title = decodeEntities(ogTitle[1]);
    const descMatch =
      raw.match(
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
      ) ??
      raw.match(
        /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
      ) ??
      raw.match(
        /<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']+)["']/i,
      );
    description = descMatch ? decodeEntities(descMatch[1]) : "";
    const ogMatch = raw.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    );
    ogImage = ogMatch ? ogMatch[1] : "";
    text = raw
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    text = decodeEntities(text);
  } else if (ct.includes("application/json")) {
    try {
      text = JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      /* keep raw */
    }
  }
  const truncated = text.length > 8000;
  if (truncated) text = text.slice(0, 8000) + "… [truncated]";
  return {
    ok: true,
    data: {
      url,
      finalUrl: res.url,
      status: res.status,
      contentType: ct,
      title,
      description,
      ogImage,
      text,
      truncated,
      elapsedMs: Date.now() - t0,
    },
  };
}
