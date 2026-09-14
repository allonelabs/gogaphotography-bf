// tests/unit/prune-dead-images.test.ts
// This script rewrites live post bodies with no undo, so the two rewrite
// functions are tested for what they must NOT destroy as much as what they cut.
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require_ = createRequire(import.meta.url);
const { dropFigure, dropSrcsetCandidate, DEAD } = require_(
  "../../scripts/goga-i18n/prune-dead-images.cjs",
) as {
  dropFigure: (body: string, url: string) => string;
  dropSrcsetCandidate: (body: string, url: string) => string;
  DEAD: RegExp;
};

const DEADURL = "https://goga.photography/wp-content/uploads/2026/04/dead.jpg";
const LIVE = "https://x.supabase.co/storage/v1/object/public/projects/a.webp";

describe("dropFigure", () => {
  it("removes the figure holding the dead image, caption included", () => {
    const body = `<p>before</p>\n<figure><img src="${DEADURL}" alt="x"><figcaption>cap</figcaption></figure>\n<h2>after</h2>`;
    const out = dropFigure(body, DEADURL);
    expect(out).not.toContain(DEADURL);
    expect(out).not.toContain("figcaption");
    expect(out).toContain("<p>before</p>");
    expect(out).toContain("<h2>after</h2>");
  });

  it("leaves neighbouring figures and their images untouched", () => {
    const body =
      `<figure><img src="${LIVE}" alt=""></figure>` +
      `<figure><img src="${DEADURL}" alt=""></figure>` +
      `<figure><img src="${LIVE}" alt=""></figure>`;
    const out = dropFigure(body, DEADURL);
    expect(out.match(/<figure/g)).toHaveLength(2);
    expect(out.match(new RegExp(LIVE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"))).toHaveLength(2);
  });

  it("keeps figure tags balanced when the dead image is nested in a gallery", () => {
    const body = `<figure class="gallery"><figure><img src="${DEADURL}" alt=""></figure><figure><img src="${LIVE}" alt=""></figure></figure>`;
    const out = dropFigure(body, DEADURL);
    expect(out).not.toContain(DEADURL);
    expect(out).toContain(LIVE);
    expect((out.match(/<figure/g) || []).length).toBe(
      (out.match(/<\/figure>/g) || []).length,
    );
  });

  it("is a no-op when the url is absent or unwrapped", () => {
    const body = `<p>nothing here</p>`;
    expect(dropFigure(body, DEADURL)).toBe(body);
    const loose = `<p><img src="${DEADURL}"></p>`;
    expect(dropFigure(loose, DEADURL)).toBe(loose);
  });

  it("does not run away when the closing tag is missing", () => {
    const body = `<figure><img src="${DEADURL}" alt="">`;
    expect(dropFigure(body, DEADURL)).toBe(body);
  });
});

describe("dropSrcsetCandidate", () => {
  it("drops only the dead candidate and keeps the rest of the widths", () => {
    const body = `<img src="${LIVE}" srcset="${DEADURL} 1024w, ${LIVE} 300w, ${LIVE} 768w">`;
    const out = dropSrcsetCandidate(body, DEADURL);
    expect(out).not.toContain(DEADURL);
    expect(out).toContain(`srcset="${LIVE} 300w, ${LIVE} 768w"`);
    expect(out).toContain(`src="${LIVE}"`);
  });

  it("handles a candidate with no width descriptor", () => {
    const body = `<img srcset="${DEADURL}, ${LIVE} 300w">`;
    expect(dropSrcsetCandidate(body, DEADURL)).toBe(`<img srcset="${LIVE} 300w">`);
  });

  it("removes the attribute entirely when nothing survives", () => {
    const body = `<img src="${LIVE}" srcset="${DEADURL} 1024w">`;
    expect(dropSrcsetCandidate(body, DEADURL)).toBe(`<img src="${LIVE}" >`);
  });

  it("leaves srcsets that do not mention the dead url byte-identical", () => {
    const body = `<img srcset="${LIVE} 300w, ${LIVE} 768w">`;
    expect(dropSrcsetCandidate(body, DEADURL)).toBe(body);
  });

  it("does not touch the src attribute, only srcset", () => {
    const body = `<img src="${DEADURL}" srcset="${LIVE} 300w">`;
    expect(dropSrcsetCandidate(body, DEADURL)).toContain(`src="${DEADURL}"`);
  });
});

describe("DEAD url pattern", () => {
  it("matches old-host uploads and stops at quotes and commas", () => {
    const body = `<img src="${DEADURL}" srcset="${DEADURL} 1024w, ${LIVE} 300w">`;
    const found = body.match(new RegExp(DEAD.source, "g")) ?? [];
    expect(found).toHaveLength(2);
    expect(found.every((u) => u === DEADURL)).toBe(true);
  });

  it("does not match the Supabase host", () => {
    expect(new RegExp(DEAD.source).test(LIVE)).toBe(false);
  });
});
