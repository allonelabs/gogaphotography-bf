// tests/unit/portfolio-albums.test.ts
import { describe, it, expect } from "vitest";
import { albumLinkRows } from "@/app/lib/goga/portfolio-albums";

describe("albumLinkRows", () => {
  it("builds join rows for a project + album ids, deduped", () => {
    expect(albumLinkRows("P1", ["a", "b", "a"])).toEqual([
      { project_id: "P1", album_id: "a" },
      { project_id: "P1", album_id: "b" },
    ]);
  });
  it("returns [] for no albums", () => {
    expect(albumLinkRows("P1", [])).toEqual([]);
  });
});
