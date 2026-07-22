// tests/unit/portfolio-albums.test.ts
import { describe, it, expect } from "vitest";
import {
  albumLinkRows,
  computeAlbumReadiness,
} from "@/app/lib/goga/portfolio-albums";

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

describe("computeAlbumReadiness", () => {
  const projects = [
    { id: "P1", published: true, hasHero: true },
    { id: "P2", published: true, hasHero: false },
    { id: "P3", published: false, hasHero: true },
  ];

  it("counts assigned / live / live-with-hero per album", () => {
    const m = computeAlbumReadiness(
      [
        { project_id: "P1", album_id: "a" },
        { project_id: "P2", album_id: "a" },
        { project_id: "P3", album_id: "a" },
        { project_id: "P2", album_id: "b" },
      ],
      projects,
    );
    expect(m.get("a")).toEqual({ assigned: 3, live: 2, liveWithHero: 1 });
    expect(m.get("b")).toEqual({ assigned: 1, live: 1, liveWithHero: 0 });
  });

  it("ignores links to unknown projects; unassigned albums get no entry", () => {
    const m = computeAlbumReadiness(
      [{ project_id: "ghost", album_id: "a" }],
      projects,
    );
    expect(m.get("a")).toBeUndefined();
    expect(m.size).toBe(0);
  });
});
