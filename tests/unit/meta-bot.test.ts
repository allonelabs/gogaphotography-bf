// tests/unit/meta-bot.test.ts
import { describe, it, expect } from "vitest";
import { buildSystemPrompt, mapLeadArgs } from "@/app/lib/goga/meta-bot";

describe("buildSystemPrompt", () => {
  it("includes studio contact, a service, and a package with price", () => {
    const s = buildSystemPrompt({
      studioInfo: {
        email: "hi@goga.ge",
        phone: "+995",
        address_locality: "Tbilisi",
        address_country: "Georgia",
        hours: "10-18",
      },
      services: [{ title_en: "Wedding", title_ka: "ქორწილი" }],
      packages: [
        {
          name_en: "Gold",
          name_ka: "ოქრო",
          base_price_cents: 50000,
          currency: "GEL",
        },
      ],
    });
    expect(s).toContain("GOGA Photography");
    expect(s).toContain("hi@goga.ge");
    expect(s).toContain("Wedding");
    expect(s).toContain("Gold");
    expect(s).toContain("500"); // 50000 cents = 500
    expect(s).toMatch(/create_lead/);
    expect(s).toMatch(/request_human/);
  });
});

describe("mapLeadArgs", () => {
  it("maps tool args to a leads insert row", () => {
    const row = mapLeadArgs({
      name: "Nino",
      contact: "nino@x.com",
      date: "2026-08-01",
      note: "wedding",
    });
    expect(row.name).toBe("Nino");
    expect(row.email).toBe("nino@x.com");
    expect(row.source).toBe("meta");
    expect(row.stage).toBe("lead");
    expect(row.shoot_date).toBe("2026-08-01");
  });
  it("routes a phone-like contact to phone", () => {
    const row = mapLeadArgs({ name: "Gio", contact: "+995555123456" });
    expect(row.phone).toBe("+995555123456");
    expect(row.email).toBeNull();
  });
});
