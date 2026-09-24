/**
 * Shared `{{placeholder}}` renderer for contract bodies and automation
 * rule subjects/bodies. Unknown placeholders render as an empty string
 * rather than being left in the output or throwing.
 */
export function renderTemplate(
  template: string,
  vars: Record<string, string | number | null | undefined>,
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) => {
    const v = vars[key];
    return v == null ? "" : String(v);
  });
}

// Deliberately excludes quotes/angle brackets from the match itself — belt
// and suspenders on top of the escape-then-validate below.
const URL_RE = /(https?:\/\/[^\s<>"')]+)/g;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Plain text → escaped HTML paragraphs, one per blank-line-separated block,
 * single newlines become <br>, and bare URLs are autolinked.
 *
 * Placeholder values (client name, addresses, etc.) can come from public
 * form input, so this walks each block splitting out URL matches *first*,
 * validates each candidate with `new URL()` restricted to http/https (never
 * javascript:/data:), and HTML-escapes both the href and the link text
 * independently. Everything that isn't a validated URL is escaped as plain
 * text — a value only becomes a link if it round-trips through the URL
 * parser clean.
 */
export function plainTextToHtml(text: string): string {
  const blocks = text
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
  return blocks
    .map((block) => {
      let out = "";
      let last = 0;
      for (const match of block.matchAll(URL_RE)) {
        const raw = match[0];
        const start = match.index ?? 0;
        out += escapeHtml(block.slice(last, start));
        out += linkify(raw);
        last = start + raw.length;
      }
      out += escapeHtml(block.slice(last));
      return `<p>${out.replace(/\n/g, "<br>")}</p>`;
    })
    .join("\n");
}

function linkify(candidate: string): string {
  let href: string | null = null;
  try {
    const u = new URL(candidate);
    if (u.protocol === "http:" || u.protocol === "https:") href = u.href;
  } catch {
    href = null;
  }
  if (!href) return escapeHtml(candidate);
  return `<a href="${escapeHtml(href)}">${escapeHtml(candidate)}</a>`;
}
