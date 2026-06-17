// tests/unit/store-finalize.test.ts
import { describe, it, expect } from "vitest";
import { buildDownloadRows } from "@/app/lib/goga/finalize-store-tbc";

describe("buildDownloadRows", () => {
  it("creates one row per item with 7-day expiry and a token", () => {
    const paidAt = new Date("2026-06-16T00:00:00Z");
    const rows = buildDownloadRows(
      "order-1",
      ["p1", "p2"],
      paidAt,
      () => "TOK",
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      order_id: "order-1",
      product_id: "p1",
      token: "TOK",
      max_downloads: 5,
    });
    expect(new Date(rows[0].expires_at).toISOString()).toBe(
      "2026-06-23T00:00:00.000Z",
    );
  });
});
