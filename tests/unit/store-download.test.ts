// tests/store-download.test.ts
import { describe, it, expect } from "vitest";
import { assessDownload } from "@/app/lib/goga/store-download";
import type { StoreDownloadRow } from "@/app/lib/db/store-types";

const base: StoreDownloadRow = {
  id: "d",
  order_id: "o",
  product_id: "p",
  token: "tok",
  downloads_used: 0,
  max_downloads: 5,
  expires_at: "2999-01-01T00:00:00Z",
  last_downloaded_at: null,
};
const NOW = new Date("2026-06-16T00:00:00Z");

describe("assessDownload", () => {
  it("allows a fresh, unexpired token", () => {
    expect(assessDownload(base, NOW)).toEqual({ ok: true });
  });
  it("rejects an expired token", () => {
    const r = assessDownload(
      { ...base, expires_at: "2020-01-01T00:00:00Z" },
      NOW,
    );
    expect(r).toEqual({ ok: false, reason: "expired" });
  });
  it("rejects when the download limit is reached", () => {
    const r = assessDownload(
      { ...base, downloads_used: 5, max_downloads: 5 },
      NOW,
    );
    expect(r).toEqual({ ok: false, reason: "limit" });
  });
});
