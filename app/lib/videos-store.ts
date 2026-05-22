// videos-store — server-only persistence for video assets metadata.
import 'server-only';

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { resolveOutRoot } from './spawn-loader';

export const VALID_SPAWN_ID = /^[a-z0-9][a-z0-9.\-_]*$/i;

export type VideoKind = 'reel' | 'ad' | 'tutorial' | 'testimonial' | 'product-demo' | 'event';
export type VideoFormat = 'vertical' | 'square' | 'horizontal';

export interface Video {
  id: string;
  kind: VideoKind;
  title: string;
  description: string;
  /** External URL (YouTube/Vimeo/Mux) — embeds via the Apps catalog. */
  externalUrl: string;
  /** Cover thumbnail — filename in /public/images/. */
  coverImage: string;
  durationSeconds: number;
  format: VideoFormat;
  platforms: Array<'youtube' | 'tiktok' | 'instagram' | 'linkedin' | 'x' | 'facebook'>;
  tags: string[];
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
}

const DEFAULT: Video[] = [];

function videosFile(id: string): string | null {
  if (!VALID_SPAWN_ID.test(id)) return null;
  return path.join(resolveOutRoot(), id, 'site', '.bf', 'videos.json');
}

export async function readVideos(spawnId: string): Promise<Video[]> {
  const f = videosFile(spawnId);
  if (!f) return DEFAULT;
  try {
    const raw = await readFile(f, 'utf8');
    const parsed = JSON.parse(raw) as Video[];
    return Array.isArray(parsed) ? parsed : DEFAULT;
  } catch { return DEFAULT; }
}

export async function writeVideos(spawnId: string, videos: Video[]): Promise<void> {
  const f = videosFile(spawnId);
  if (!f) throw new Error('invalid spawn id');
  await mkdir(path.dirname(f), { recursive: true });
  await writeFile(f, JSON.stringify(videos, null, 2), 'utf8');
}
