// app/lib/goga/portfolio-albums.ts
import "server-only";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import type {
  PortfolioAlbumRow,
  ProjectAlbumRow,
} from "@/app/lib/db/portfolio-types";

/** Pure: dedup album ids → join rows for a project. */
export function albumLinkRows(
  projectId: string,
  albumIds: string[],
): ProjectAlbumRow[] {
  return Array.from(new Set(albumIds)).map((album_id) => ({
    project_id: projectId,
    album_id,
  }));
}

export async function listAlbums(): Promise<PortfolioAlbumRow[]> {
  const { data } = await gogaAdmin()
    .from("portfolio_albums")
    .select("*")
    .order("sort_order", { ascending: true });
  return (data ?? []) as PortfolioAlbumRow[];
}

export type AlbumReadiness = {
  assigned: number;
  live: number;
  liveWithHero: number;
};

/** Pure: fold join rows + project state into per-album readiness counts. */
export function computeAlbumReadiness(
  links: ProjectAlbumRow[],
  projects: Array<{ id: string; published: boolean; hasHero: boolean }>,
): Map<string, AlbumReadiness> {
  const byId = new Map(projects.map((p) => [p.id, p]));
  const out = new Map<string, AlbumReadiness>();
  for (const l of links) {
    const p = byId.get(l.project_id);
    if (!p) continue;
    const r = out.get(l.album_id) ?? { assigned: 0, live: 0, liveWithHero: 0 };
    r.assigned += 1;
    if (p.published) {
      r.live += 1;
      if (p.hasHero) r.liveWithHero += 1;
    }
    out.set(l.album_id, r);
  }
  return out;
}

/**
 * Per-album readiness. Album cards always render publicly, but an album only
 * gets a cover and visible content when at least one assigned project is
 * published AND has a hero image (the public grid drops hero-less projects),
 * so liveWithHero is the number of projects that actually show.
 */
export async function listAlbumReadiness(): Promise<
  Map<string, AlbumReadiness>
> {
  const sb = gogaAdmin();
  const [links, projects] = await Promise.all([
    sb.from("project_albums").select("project_id, album_id"),
    sb.from("projects").select("id, published, hero_image_path"),
  ]);
  return computeAlbumReadiness(
    (links.data ?? []) as ProjectAlbumRow[],
    (projects.data ?? []).map((p) => ({
      id: p.id,
      published: !!p.published,
      hasHero: !!p.hero_image_path,
    })),
  );
}

export async function getProjectAlbumIds(projectId: string): Promise<string[]> {
  const { data } = await gogaAdmin()
    .from("project_albums")
    .select("album_id")
    .eq("project_id", projectId);
  return (data ?? []).map((r) => r.album_id);
}

/** Replace a project's album set. */
export async function setProjectAlbums(
  projectId: string,
  albumIds: string[],
): Promise<void> {
  const sb = gogaAdmin();
  await sb.from("project_albums").delete().eq("project_id", projectId);
  const rows = albumLinkRows(projectId, albumIds);
  if (rows.length > 0) await sb.from("project_albums").insert(rows);
}

export async function updateAlbum(
  id: string,
  patch: Partial<PortfolioAlbumRow>,
): Promise<void> {
  await gogaAdmin()
    .from("portfolio_albums")
    .update(patch as PortfolioAlbumRow)
    .eq("id", id);
}
