// tests/unit/blog-sanitize.test.ts
import { describe, it, expect } from "vitest";
import { sanitizeBlogHtml } from "@/app/lib/goga/blog-sanitize";

describe("sanitizeBlogHtml", () => {
  it("keeps allowed tags and attributes", () => {
    const html =
      '<h2>Title</h2><p><strong>bold</strong> <a href="https://x.com">link</a></p><img src="https://i/x.jpg" alt="a">';
    const out = sanitizeBlogHtml(html);
    expect(out).toContain("<h2>Title</h2>");
    expect(out).toContain("<strong>bold</strong>");
    expect(out).toContain('href="https://x.com"');
    expect(out).toContain("<img");
    expect(out).toContain('alt="a"');
  });
  it("strips scripts, event handlers and javascript: hrefs", () => {
    const html =
      '<p onclick="evil()">x</p><script>alert(1)</script><a href="javascript:alert(1)">y</a>';
    const out = sanitizeBlogHtml(html);
    expect(out).not.toContain("<script");
    expect(out).not.toContain("onclick");
    expect(out).not.toContain("javascript:");
  });
});
