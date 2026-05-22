// ════════════════════════════════════════════════════════════════════════════
// posts-store — server-only persistence for blog posts.
//
// Layout:
//   .bf/posts.json   ← array of Post (one entry per post)
//
// Public render lives at /journal/<slug> on the spawned site (content-factory's
// existing convention). The bridge from posts.json → spawn pages emits in the
// next composer pass.
// ════════════════════════════════════════════════════════════════════════════
import 'server-only';

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { resolveOutRoot } from './spawn-loader';

export const VALID_SPAWN_ID = /^[a-z0-9][a-z0-9.\-_]*$/i;

export interface Post {
  id: string;
  slug: string;
  title: string;
  /** One-line summary used as meta description + listing card lead. */
  excerpt: string;
  /** Markdown body. */
  body: string;
  /** Filename in /public/images/ — empty = no cover. */
  coverImage: string;
  authorName: string;
  authorEmail: string;
  tags: string[];
  status: 'draft' | 'published' | 'scheduled';
  /** ISO; for scheduled posts the publish goes live at that time. */
  publishAt?: string;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT: Post[] = [];

function postsFile(id: string): string | null {
  if (!VALID_SPAWN_ID.test(id)) return null;
  return path.join(resolveOutRoot(), id, 'site', '.bf', 'posts.json');
}

export async function readPosts(spawnId: string): Promise<Post[]> {
  const f = postsFile(spawnId);
  if (!f) return DEFAULT;
  try {
    const raw = await readFile(f, 'utf8');
    const parsed = JSON.parse(raw) as Post[];
    return Array.isArray(parsed) ? parsed : DEFAULT;
  } catch { return DEFAULT; }
}

export async function writePosts(spawnId: string, posts: Post[]): Promise<void> {
  const f = postsFile(spawnId);
  if (!f) throw new Error('invalid spawn id');
  await mkdir(path.dirname(f), { recursive: true });
  await writeFile(f, JSON.stringify(posts, null, 2), 'utf8');
}

export function emptyPost(): Post {
  const now = new Date().toISOString();
  const id = `post_${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    slug: id.replace(/^post_/, ''),
    title: 'New post',
    excerpt: '',
    body: '',
    coverImage: '',
    authorName: '',
    authorEmail: '',
    tags: [],
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}
