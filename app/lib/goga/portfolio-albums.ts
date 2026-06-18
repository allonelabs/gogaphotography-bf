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
