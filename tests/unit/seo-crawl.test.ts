// tests/unit/seo-crawl.test.ts
import { describe, it, expect } from "vitest";
import { parsePage, parseSitemap } from "@/app/lib/goga/seo-crawl";

const URL = "https://gogaphotography.ge/faq";
const wrap = (body: string) => `<html><head><title>t</title></head><body>${body}</body></html>`;

describe("parsePage image handling", () => {
  it("counts an image with real alt text as handled", () => {
    const f = parsePage(URL, wrap(`<img src="a.jpg" alt="Bride in Tbilisi">`));
    expect(f.imgCount).toBe(1);
    expect(f.imgWithAlt).toBe(1);
  });

  it("counts a decorative image as handled when it says so", () => {
    // Empty alt plus an explicit marker is the WCAG-correct treatment for a
    // spacer or overlay graphic, not an omission.
    for (const marker of ['aria-hidden="true"', 'role="presentation"', 'role="none"']) {
      const f = parsePage(URL, wrap(`<img src="spacer.svg" alt="" ${marker}>`));
      expect(f.imgWithAlt, marker).toBe(1);
    }
  });

  it("still flags an empty alt with no marker, which is just an omission", () => {
    const f = parsePage(URL, wrap(`<img src="photo.jpg" alt="">`));
    expect(f.imgCount).toBe(1);
    expect(f.imgWithAlt).toBe(0);
  });

  it("flags an image with no alt attribute at all", () => {
    const f = parsePage(URL, wrap(`<img src="photo.jpg">`));
    expect(f.imgWithAlt).toBe(0);
  });

  it("separates handled from unhandled in a realistic mix", () => {
    const f = parsePage(
      URL,
      wrap(`
        <img src="hero.jpg" alt="Wedding in Kakheti">
        <img src="rotate.svg" alt="" aria-hidden="true">
        <img src="forgotten.jpg" alt="">
      `),
    );
    expect(f.imgCount).toBe(3);
    expect(f.imgWithAlt).toBe(2);
  });
});

describe("parsePage metadata", () => {
  it("reads title, description, canonical and detects schema", () => {
    const html = `<html><head>
      <title>Wedding photography in Tbilisi</title>
      <meta name="description" content="A description.">
      <link rel="canonical" href="${URL}">
      <meta property="og:title" content="x">
      <meta name="twitter:card" content="summary">
      <script type="application/ld+json">{"@type":"WebPage"}</script>
    </head><body><p>Body copy.</p></body></html>`;
    const f = parsePage(URL, html);
    expect(f.title).toBe("Wedding photography in Tbilisi");
    expect(f.description).toBe("A description.");
    expect(f.canonical).toBe(URL);
    expect(f.hasOpenGraph).toBe(true);
    expect(f.hasTwitterCard).toBe(true);
    expect(f.hasSchema).toBe(true);
  });

  it("strips script and style out of the body text it measures", () => {
    const f = parsePage(URL, wrap(`<script>var hidden="secret"</script><p>Visible copy.</p>`));
    expect(f.body).toContain("Visible copy.");
    expect(f.body).not.toContain("secret");
  });
});

describe("parseSitemap", () => {
  it("extracts and de-duplicates urls", () => {
    const xml = `<urlset>
      <url><loc>https://a.com/one</loc></url>
      <url><loc>https://a.com/two</loc></url>
      <url><loc>https://a.com/one</loc></url>
    </urlset>`;
    expect(parseSitemap(xml)).toEqual(["https://a.com/one", "https://a.com/two"]);
  });

  it("honours the cap so a runaway sitemap cannot spend the whole budget", () => {
    const xml = Array.from({ length: 50 }, (_, i) => `<url><loc>https://a.com/${i}</loc></url>`).join("");
    expect(parseSitemap(xml, 10)).toHaveLength(10);
  });
});

describe("javascript templates are not images", () => {
  const wrapT = (b: string) => `<html><head><title>t</title></head><body>${b}</body></html>`;

  it("ignores a tag whose alt is still a JS expression", () => {
    // This reads raw HTML and cannot run the page's scripts. Counting the
    // template would report a permanent failure for an image the browser
    // describes correctly the moment it renders.
    const f = parsePage(URL, wrapT(`<img src="'+im.url+'" alt="'+altFor(im)+'" loading="lazy">`));
    expect(f.imgCount).toBe(0);
    expect(f.imgWithAlt).toBe(0);
  });

  it("ignores a template even when its alt is an empty literal", () => {
    const f = parsePage(URL, wrapT(`<img src="'+p.cover_url+'" alt="">`));
    expect(f.imgCount).toBe(0);
  });

  it("still counts real images on a page that also contains a template", () => {
    const f = parsePage(
      URL,
      wrapT(`
        <img src="real.jpg" alt="A real photograph">
        <img src="'+im.url+'" alt="'+altFor(im)+'">
        <img src="forgotten.jpg" alt="">
      `),
    );
    expect(f.imgCount).toBe(2);
    expect(f.imgWithAlt).toBe(1);
  });
});
