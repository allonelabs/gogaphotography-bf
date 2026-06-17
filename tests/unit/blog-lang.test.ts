// tests/unit/blog-lang.test.ts
import { describe, it, expect } from "vitest";
import { pickLang, normalizeLang } from "@/app/lib/goga/blog-lang";

describe("pickLang", () => {
  it("returns the requested language when present", () => {
    expect(pickLang("ka-val", "en-val", "ka")).toBe("ka-val");
    expect(pickLang("ka-val", "en-val", "en")).toBe("en-val");
  });
  it("falls back to the other language when requested is empty", () => {
    expect(pickLang("", "en-val", "ka")).toBe("en-val");
    expect(pickLang("ka-val", "", "en")).toBe("ka-val");
  });
  it("returns empty string when both empty", () => {
    expect(pickLang("", "", "ka")).toBe("");
  });
});

describe("normalizeLang", () => {
  it("defaults to ka and only accepts en", () => {
    expect(normalizeLang(undefined)).toBe("ka");
    expect(normalizeLang("en")).toBe("en");
    expect(normalizeLang("fr")).toBe("ka");
  });
});
