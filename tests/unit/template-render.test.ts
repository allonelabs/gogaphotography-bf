import { describe, it, expect } from "vitest";
import {
  renderTemplate,
  plainTextToHtml,
} from "@/app/lib/goga/template-render";

describe("renderTemplate", () => {
  it("fills known placeholders", () => {
    const out = renderTemplate("Hello {{client_name}}, total {{total}}.", {
      client_name: "Nino",
      total: "1,000 ₾",
    });
    expect(out).toBe("Hello Nino, total 1,000 ₾.");
  });

  it("renders unknown placeholders as empty string", () => {
    const out = renderTemplate("Hi {{client_name}}{{nope}}!", {
      client_name: "Nino",
    });
    expect(out).toBe("Hi Nino!");
  });

  it("renders null/undefined values as empty string", () => {
    const out = renderTemplate("[{{a}}][{{b}}]", { a: null, b: undefined });
    expect(out).toBe("[][]");
  });

  it("substitutes the same placeholder repeated multiple times", () => {
    const out = renderTemplate("{{x}}-{{x}}", { x: "z" });
    expect(out).toBe("z-z");
  });
});

describe("plainTextToHtml", () => {
  it("wraps blank-line-separated blocks in paragraphs", () => {
    const html = plainTextToHtml("First line.\n\nSecond paragraph.");
    expect(html).toBe("<p>First line.</p>\n<p>Second paragraph.</p>");
  });

  it("turns single newlines into <br>", () => {
    const html = plainTextToHtml("Line one\nLine two");
    expect(html).toContain("Line one<br>Line two");
  });

  it("autolinks bare URLs and escapes HTML-significant characters", () => {
    const html = plainTextToHtml("Visit https://example.com/x?y=1 & enjoy <3");
    expect(html).toContain(
      '<a href="https://example.com/x?y=1">https://example.com/x?y=1</a>',
    );
    expect(html).toContain("&amp;");
    expect(html).toContain("&lt;3");
  });

  it("never lets a malicious placeholder value break out of the href attribute", () => {
    // Placeholder values (client_name etc.) can originate from public form
    // input — a value crafted to look like it could close href="" and
    // inject a new attribute/event handler must render fully inert.
    const html = plainTextToHtml('Hello x" onmouseover="alert(1)');
    expect(html).not.toContain('"alert(1)"');
    expect(html).not.toContain('onmouseover="alert');
    expect(html).toContain("&quot;");
  });

  it("never emits a raw <script> tag from an untrusted value", () => {
    const html = plainTextToHtml("Hi <script>alert(1)</script> there");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("only autolinks http/https URLs that parse cleanly — never javascript: URIs", () => {
    const html = plainTextToHtml("Click javascript:alert(1) now");
    expect(html).not.toContain("<a href");
  });

  it("escapes quote characters embedded right after a URL match with no whitespace", () => {
    // The highest-risk shape — no whitespace between the URL and the
    // injected quote, so a naive "escape after autolink" implementation
    // would insert the raw quote straight into href="".
    const html = plainTextToHtml(
      'See http://evil.com"onmouseover="alert(1) ok',
    );
    expect(html).not.toMatch(/href="[^"]*"[^>]*onmouseover/);
    expect(html).toContain("&quot;onmouseover=&quot;alert(1)");
  });
});
