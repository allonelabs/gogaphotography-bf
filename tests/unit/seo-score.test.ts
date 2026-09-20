// tests/unit/seo-score.test.ts
import { describe, it, expect } from "vitest";
import { scorePage, type PageFacts } from "@/app/lib/goga/seo-score";

const URL = "https://gogaphotography.ge/blog/wedding";

/** A page that passes everything, so each test can break exactly one thing.
 *  Title is 58 characters and the description 151, both inside the windows;
 *  both must literally contain the focus keyword, "wedding photography" -
 *  "photographer" does not match "photography" and the scorer is right to say
 *  so. */
const perfect: PageFacts = {
  url: URL,
  title: "Wedding photography in Tbilisi: what a package covers",
  description:
    "Wedding photography in Tbilisi: what a full package covers, how many hours are typical, when to book, and what the finished gallery looks like at the end.",
  canonical: URL,
  body: "Wedding photography in Tbilisi starts with a conversation about the day.",
  focusKeyword: "wedding photography",
  hasOpenGraph: true,
  hasTwitterCard: true,
  hasSchema: true,
  imgCount: 4,
  imgWithAlt: 4,
};

const check = (f: PageFacts, id: string) =>
  scorePage(f).checks.find((c) => c.id === id)!;

describe("scorePage", () => {
  it("gives a fully-optimised page 100", () => {
    const r = scorePage(perfect);
    expect(r.score).toBe(100);
    expect(r.failures).toBe(0);
  });

  it("scores an empty page near zero without throwing", () => {
    const r = scorePage({ url: URL });
    // Not exactly 0: a page with no images passes the alt check vacuously,
    // which is the honest answer to "do the images have alt text".
    expect(r.score).toBeLessThan(10);
    expect(r.failures).toBeGreaterThan(0);
    expect(r.checks.every((c) => c.pass || c.points === 0)).toBe(true);
  });

  it("stays out of 100 when no focus keyword is set", () => {
    // A page nobody assigned a keyword to should not look broken: the three
    // keyword checks drop out and the rest still scale to 100.
    const r = scorePage({ ...perfect, focusKeyword: null });
    expect(r.score).toBe(100);
    expect(r.checks.some((c) => c.id.startsWith("keyword_"))).toBe(false);
  });

  it("scores a keyword-less page below one that has it, all else equal", () => {
    const withKeyword = scorePage({ ...perfect, title: "No mention here at all of the subject" });
    const without = scorePage({ ...perfect, title: "No mention here at all of the subject", focusKeyword: null });
    expect(withKeyword.score).toBeLessThan(without.score);
  });
});

describe("title and description length", () => {
  it("fails a title that is too short or too long", () => {
    expect(check({ ...perfect, title: "Weddings" }, "title_length").pass).toBe(false);
    expect(check({ ...perfect, title: "W".repeat(90) }, "title_length").pass).toBe(false);
  });

  it("accepts the exact boundaries", () => {
    expect(check({ ...perfect, title: "x".repeat(30) }, "title_length").pass).toBe(true);
    expect(check({ ...perfect, title: "x".repeat(60) }, "title_length").pass).toBe(true);
  });

  it("fails a description outside 120-160", () => {
    expect(check({ ...perfect, description: "Too short." }, "description_length").pass).toBe(false);
    expect(check({ ...perfect, description: "x".repeat(200) }, "description_length").pass).toBe(false);
    expect(check({ ...perfect, description: "x".repeat(140) }, "description_length").pass).toBe(true);
  });

  it("reports the measured length so the author knows how far off they are", () => {
    const c = check({ ...perfect, title: "Short" }, "title_length");
    expect(c.detail).toContain("5 characters");
  });
});

describe("canonical", () => {
  it("passes when the canonical points at the page itself", () => {
    expect(check(perfect, "canonical_self").pass).toBe(true);
  });

  it("ignores a trailing slash difference", () => {
    expect(check({ ...perfect, canonical: URL + "/" }, "canonical_self").pass).toBe(true);
  });

  it("ignores a protocol difference", () => {
    expect(
      check({ ...perfect, canonical: URL.replace("https://", "http://") }, "canonical_self").pass,
    ).toBe(true);
  });

  it("catches a canonical pointing at another domain", () => {
    // The real bug on this site: every page pointed at the old WordPress host,
    // handing the ranking to a site about to be retired.
    const c = check({ ...perfect, canonical: "https://goga.photography/" }, "canonical_self");
    expect(c.pass).toBe(false);
    expect(c.detail).toContain("goga.photography");
  });

  it("does not pass canonical_self when there is no canonical at all", () => {
    const f = { ...perfect, canonical: "" };
    expect(check(f, "canonical_present").pass).toBe(false);
    expect(check(f, "canonical_self").pass).toBe(false);
  });
});

describe("keyword placement", () => {
  it("fails when the keyword is missing from the title", () => {
    expect(check({ ...perfect, title: "A photographer writes about his year" }, "keyword_in_title").pass).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(check({ ...perfect, focusKeyword: "WEDDING PHOTOGRAPHY" }, "keyword_in_title").pass).toBe(true);
  });

  it("fails when the keyword appears only late in the body", () => {
    const f = { ...perfect, body: "x".repeat(400) + " wedding photography" };
    expect(check(f, "keyword_early_in_body").pass).toBe(false);
  });
});

describe("tags and images", () => {
  it("flags missing OpenGraph, Twitter and schema", () => {
    const f = { ...perfect, hasOpenGraph: false, hasTwitterCard: false, hasSchema: false };
    expect(check(f, "opengraph").pass).toBe(false);
    expect(check(f, "twitter_card").pass).toBe(false);
    expect(check(f, "schema").pass).toBe(false);
  });

  it("passes the alt check when a page has no images at all", () => {
    expect(check({ ...perfect, imgCount: 0, imgWithAlt: 0 }, "images_have_alt").pass).toBe(true);
  });

  it("fails and counts the images that are missing alt text", () => {
    const c = check({ ...perfect, imgCount: 10, imgWithAlt: 7 }, "images_have_alt");
    expect(c.pass).toBe(false);
    expect(c.detail).toContain("3 of 10");
  });
});

describe("score arithmetic", () => {
  it("never exceeds 100 or drops below 0", () => {
    for (const f of [perfect, { url: URL }, { ...perfect, focusKeyword: null }]) {
      const s = scorePage(f).score;
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });

  it("awards no points for a failed check", () => {
    const c = check({ ...perfect, hasSchema: false }, "schema");
    expect(c.points).toBe(0);
    expect(c.max).toBe(10);
  });
});
