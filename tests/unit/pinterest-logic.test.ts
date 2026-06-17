// tests/unit/pinterest-logic.test.ts
import { describe, it, expect } from "vitest";
import {
  resolveBoard,
  buildPinPayload,
  dueItems,
  needsRefresh,
} from "@/app/lib/goga/pinterest-logic";

describe("resolveBoard", () => {
  const map = { "blog:weddings": "B1", blog: "B2", product: "B3" };
  it("prefers type:category, then type, then default", () => {
    expect(resolveBoard("blog", "weddings", map, "D")).toBe("B1");
    expect(resolveBoard("blog", "portraits", map, "D")).toBe("B2");
    expect(resolveBoard("product", null, map, "D")).toBe("B3");
    expect(resolveBoard("project", null, map, "D")).toBe("D");
    expect(resolveBoard("project", null, {}, null)).toBe(null);
  });
});

describe("buildPinPayload", () => {
  it("builds a blog pin with ka title and blog link", () => {
    const p = buildPinPayload({
      contentType: "blog",
      slug: "nino-giorgi",
      titleKa: "ნინო",
      titleEn: "Nino",
      excerptKa: "აღწერა",
      excerptEn: "desc",
      coverUrl: "https://img/x.jpg",
      origin: "https://goga.app",
    });
    expect(p.title).toBe("ნინო");
    expect(p.description).toBe("აღწერა");
    expect(p.link).toBe("https://goga.app/blog/nino-giorgi");
    expect(p.image_url).toBe("https://img/x.jpg");
  });
  it("falls back to EN and truncates long fields", () => {
    const p = buildPinPayload({
      contentType: "product",
      slug: "warm",
      titleKa: "",
      titleEn: "Warm",
      excerptKa: "",
      excerptEn: "x".repeat(600),
      coverUrl: "u",
      origin: "https://g",
    });
    expect(p.title).toBe("Warm");
    expect(p.link).toBe("https://g/store/warm");
    expect(p.description.length).toBe(500);
  });
});

describe("dueItems", () => {
  const now = new Date("2026-06-17T12:00:00Z");
  const rows = [
    { id: "a", status: "queued", scheduled_for: "2026-06-17T10:00:00Z" },
    { id: "b", status: "queued", scheduled_for: "2026-06-17T13:00:00Z" },
    { id: "c", status: "posted", scheduled_for: "2026-06-17T09:00:00Z" },
    { id: "d", status: "queued", scheduled_for: "2026-06-17T08:00:00Z" },
  ];
  it("returns queued, due, oldest-first, capped", () => {
    const out = dueItems(rows as never, now, 1);
    expect(out.map((r) => r.id)).toEqual(["d"]);
    const out2 = dueItems(rows as never, now, 5);
    expect(out2.map((r) => r.id)).toEqual(["d", "a"]);
  });
});

describe("needsRefresh", () => {
  const now = new Date("2026-06-17T12:00:00Z");
  it("true when expired or within skew, false when valid", () => {
    expect(needsRefresh("2026-06-17T11:00:00Z", now)).toBe(true);
    expect(needsRefresh("2026-06-17T13:00:00Z", now)).toBe(false);
    expect(needsRefresh(null, now)).toBe(true);
  });
});
