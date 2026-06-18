// app/lib/db/portfolio-types.ts
export type PortfolioAlbumRow = {
  id: string;
  slug: string;
  name_en: string;
  name_ka: string;
  sort_order: number;
  created_at: string;
};
export type ProjectAlbumRow = {
  project_id: string;
  album_id: string;
};
