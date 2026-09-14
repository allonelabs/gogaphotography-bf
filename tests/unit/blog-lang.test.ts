// tests/unit/blog-lang.test.ts
import { describe, it, expect } from "vitest";
import { pickLang, normalizeLang } from "@/app/lib/goga/blog-lang";

const all = { ka: "ka-val", en: "en-val", ru: "ru-val" };

describe("pickLang", () => {
  it("returns the requested language when present", () => {
    expect(pickLang(all, "ka")).toBe("ka-val");
    expect(pickLang(all, "en")).toBe("en-val");
    expect(pickLang(all, "ru")).toBe("ru-val");
  });

  it("falls back to Georgian before English", () => {
    expect(pickLang({ ...all, ru: null }, "ru")).toBe("ka-val");
    expect(pickLang({ ...all, en: "" }, "en")).toBe("ka-val");
    expect(pickLang({ ka: "", en: "en-val", ru: null }, "ru")).toBe("en-val");
    expect(pickLang({ ka: "   ", en: "en-val", ru: "" }, "ru")).toBe("en-val");
  });

  it("never falls back to a third language the reader did not ask for", () => {
    // A Georgian reader must not be handed Russian.
    expect(pickLang({ ka: null, en: "", ru: "ru-val" }, "ka")).toBe("");
  });

  it("returns empty string when every field is empty", () => {
    expect(pickLang({ ka: "", en: null, ru: null }, "ka")).toBe("");
    expect(pickLang({ ka: "", en: null, ru: null }, "ru")).toBe("");
  });
});

describe("normalizeLang", () => {
  it("accepts the three supported languages", () => {
    expect(normalizeLang("ka")).toBe("ka");
    expect(normalizeLang("en")).toBe("en");
    expect(normalizeLang("ru")).toBe("ru");
  });

  it("defaults to Georgian for anything else", () => {
    expect(normalizeLang(undefined)).toBe("ka");
    expect(normalizeLang(null)).toBe("ka");
    expect(normalizeLang("")).toBe("ka");
    expect(normalizeLang("fr")).toBe("ka");
    expect(normalizeLang("RU")).toBe("ka");
  });
});
