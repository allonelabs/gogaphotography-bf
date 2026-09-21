// app/lib/goga/seo-score.ts
//
// Thirteen checks, 100 points, one pure function. No network, no DOM: it takes
// already-parsed page facts so it can be unit-tested exhaustively and reused by
// both surfaces that need it - the site-wide crawl and the live panel in the
// blog editor.
//
// The thresholds are the ones search engines actually truncate at, not round
// numbers: titles are cut around 60 characters and descriptions around 160, so
// those are the ceilings. The floors (30 and 120) catch the opposite failure -
// a title or description too thin to say anything.

export type SeoCheckId =
  | "title_present"
  | "title_length"
  | "description_present"
  | "description_length"
  | "keyword_in_title"
  | "keyword_in_description"
  | "keyword_early_in_body"
  | "canonical_present"
  | "canonical_self"
  | "opengraph"
  | "twitter_card"
  | "schema"
  | "images_have_alt";

export interface SeoCheck {
  id: SeoCheckId;
  /** Shown in the admin, Georgian first - this panel is for Goga. */
  label: string;
  labelEn: string;
  points: number;
  max: number;
  pass: boolean;
  /** Why it failed, when it did. Empty on a pass. */
  detail: string;
}

/** Everything the scorer needs about one page. All fields are optional: a page
 *  missing them is precisely what this is looking for. */
export interface PageFacts {
  url: string;
  title?: string | null;
  description?: string | null;
  canonical?: string | null;
  /** Visible body text, tags already stripped. */
  body?: string | null;
  /** The term this page is trying to rank for. Optional - the three keyword
   *  checks are skipped and their points redistributed when absent, rather than
   *  scoring a page down for a field the author never filled in. */
  focusKeyword?: string | null;
  hasOpenGraph?: boolean;
  hasTwitterCard?: boolean;
  hasSchema?: boolean;
  /**
   * Images that still need alt text, and the total counted.
   *
   * `imgWithAlt` counts images that are *correctly handled*, which is not the
   * same as images carrying words. WCAG 1.1.1 requires a decorative image to
   * have an empty alt so assistive tech skips it: forcing a description onto a
   * spacer or a rotate-your-phone overlay makes a screen reader read out noise
   * and is a regression, not a fix. So an image passes if it has real alt text
   * OR is explicitly marked decorative.
   */
  imgCount?: number;
  imgWithAlt?: number;
}

export interface SeoResult {
  url: string;
  /** 0-100, rounded. */
  score: number;
  checks: SeoCheck[];
  /** Count of checks that did not get full marks. */
  failures: number;
}

const TITLE_MIN = 30;
const TITLE_MAX = 60;
const DESC_MIN = 120;
const DESC_MAX = 160;
/** How far into the body the focus keyword should appear. Roughly the first
 *  paragraph - if the subject has not been named by then, the page buries it. */
const KEYWORD_LEAD_CHARS = 200;

const norm = (s: string | null | undefined): string => (s ?? "").trim();
const lower = (s: string | null | undefined): string => norm(s).toLowerCase();

/** Compare hrefs ignoring trailing slash and protocol, so `https://x.com/a` and
 *  `https://x.com/a/` are the same page - which they are. */
function sameUrl(a: string, b: string): boolean {
  const strip = (u: string) =>
    u
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "");
  return strip(a) === strip(b) && strip(a).length > 0;
}

export function scorePage(facts: PageFacts): SeoResult {
  const title = norm(facts.title);
  const description = norm(facts.description);
  const canonical = norm(facts.canonical);
  const body = norm(facts.body);
  const keyword = lower(facts.focusKeyword);
  const hasKeyword = keyword.length > 0;

  const checks: SeoCheck[] = [];
  const add = (
    id: SeoCheckId,
    label: string,
    labelEn: string,
    max: number,
    pass: boolean,
    detail = "",
  ) => checks.push({ id, label, labelEn, max, points: pass ? max : 0, pass, detail });

  add(
    "title_present",
    "SEO სათაური დამატებულია",
    "Title is set",
    5,
    title.length > 0,
    "No <title> on the page.",
  );
  add(
    "title_length",
    `SEO სათაური ${TITLE_MIN}-${TITLE_MAX} სიმბოლო`,
    `Title is ${TITLE_MIN}-${TITLE_MAX} characters`,
    10,
    title.length >= TITLE_MIN && title.length <= TITLE_MAX,
    title.length === 0
      ? "No title to measure."
      : title.length < TITLE_MIN
        ? `${title.length} characters - too thin to describe the page.`
        : `${title.length} characters - search results cut off near ${TITLE_MAX}.`,
  );
  add(
    "description_present",
    "Meta Description დამატებულია",
    "Meta description is set",
    5,
    description.length > 0,
    "No meta description.",
  );
  add(
    "description_length",
    `Meta Description ${DESC_MIN}-${DESC_MAX} სიმბოლო`,
    `Meta description is ${DESC_MIN}-${DESC_MAX} characters`,
    10,
    description.length >= DESC_MIN && description.length <= DESC_MAX,
    description.length === 0
      ? "No description to measure."
      : description.length < DESC_MIN
        ? `${description.length} characters - room for more.`
        : `${description.length} characters - cut off near ${DESC_MAX}.`,
  );

  // The keyword checks only apply when a focus keyword exists. Their points are
  // redistributed below rather than counted as failures, so an unfilled field
  // does not read as a broken page.
  if (hasKeyword) {
    add(
      "keyword_in_title",
      "Focus Keyword სათაურშია",
      "Focus keyword in title",
      10,
      title.toLowerCase().includes(keyword),
      `"${facts.focusKeyword}" does not appear in the title.`,
    );
    add(
      "keyword_in_description",
      "Focus Keyword აღწერაშია",
      "Focus keyword in description",
      10,
      description.toLowerCase().includes(keyword),
      `"${facts.focusKeyword}" does not appear in the description.`,
    );
    add(
      "keyword_early_in_body",
      "Focus Keyword ტექსტის დასაწყისშია",
      "Focus keyword appears early in the body",
      10,
      body.slice(0, KEYWORD_LEAD_CHARS).toLowerCase().includes(keyword),
      `"${facts.focusKeyword}" is not in the first ${KEYWORD_LEAD_CHARS} characters.`,
    );
  }

  add(
    "canonical_present",
    "Canonical URL მითითებულია",
    "Canonical URL is set",
    10,
    canonical.length > 0,
    "No canonical link - duplicate URLs will compete with each other.",
  );
  // The expensive one. A canonical pointing somewhere else tells search engines
  // "the real version of this page is over there", handing the ranking away.
  add(
    "canonical_self",
    "Canonical თავად გვერდზე მიუთითებს",
    "Canonical points at this page",
    10,
    canonical.length > 0 && sameUrl(canonical, facts.url),
    canonical.length === 0
      ? "No canonical to check."
      : `Points at ${canonical} instead of this page - the ranking is being handed to that URL.`,
  );
  add(
    "opengraph",
    "OpenGraph სრულადაა შევსებული",
    "OpenGraph tags present",
    10,
    facts.hasOpenGraph === true,
    "No og: tags - links shared to Facebook or WhatsApp will look bare.",
  );
  add(
    "twitter_card",
    "Twitter Card ტეგებია შევსებული",
    "Twitter Card tags present",
    5,
    facts.hasTwitterCard === true,
    "No twitter: tags.",
  );
  add(
    "schema",
    "Schema ტიპი არჩეულია",
    "Structured data present",
    10,
    facts.hasSchema === true,
    "No JSON-LD - the page cannot qualify for rich results.",
  );

  const imgCount = facts.imgCount ?? 0;
  const imgWithAlt = facts.imgWithAlt ?? 0;
  add(
    "images_have_alt",
    "სურათებს alt ტექსტი აქვს",
    "Images have alt text",
    5,
    imgCount === 0 || imgWithAlt >= imgCount,
    `${imgCount - imgWithAlt} of ${imgCount} images have neither alt text nor a decorative marker.`,
  );

  const earned = checks.reduce((n, c) => n + c.points, 0);
  const possible = checks.reduce((n, c) => n + c.max, 0);
  // Scale to 100 so a page without a focus keyword is still scored out of 100
  // rather than out of 70 - otherwise every page looks broken by default.
  const score = possible === 0 ? 0 : Math.round((earned / possible) * 100);

  return {
    url: facts.url,
    score,
    checks,
    failures: checks.filter((c) => !c.pass).length,
  };
}
