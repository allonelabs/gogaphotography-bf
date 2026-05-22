// ════════════════════════════════════════════════════════════════════════════
// social-store — server-only persistence for outbound social posts.
//
// Layout:
//   .bf/social-posts.json   ← scheduled / drafted posts per platform
// ════════════════════════════════════════════════════════════════════════════
import 'server-only';

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { resolveOutRoot } from './spawn-loader';

export const VALID_SPAWN_ID = /^[a-z0-9][a-z0-9.\-_]*$/i;

export type Platform = 'x' | 'linkedin' | 'instagram' | 'facebook' | 'pinterest' | 'threads' | 'bluesky';

export interface SocialPost {
  id: string;
  platforms: Platform[];
  body: string;
  /** Filename in /public/images/. */
  imageName: string;
  /** Per-platform character cap inferred at save time; informational. */
  characterCount: number;
  status: 'draft' | 'scheduled' | 'posted' | 'failed';
  /** ISO when this post should go live. */
  scheduledAt?: string;
  /** ISO when actually posted (engine-set). */
  postedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT: SocialPost[] = [];

export const PLATFORM_LIMITS: Record<Platform, { maxChars: number; label: string; icon: string }> = {
  x:         { maxChars: 280,  label: 'X / Twitter', icon: '𝕏' },
  linkedin:  { maxChars: 3000, label: 'LinkedIn',    icon: 'in' },
  instagram: { maxChars: 2200, label: 'Instagram',   icon: 'IG' },
  facebook:  { maxChars: 63206,label: 'Facebook',    icon: 'f' },
  pinterest: { maxChars: 500,  label: 'Pinterest',   icon: 'P' },
  threads:   { maxChars: 500,  label: 'Threads',     icon: '@' },
  bluesky:   { maxChars: 300,  label: 'Bluesky',     icon: '🦋' },
};

function postsFile(id: string): string | null {
  if (!VALID_SPAWN_ID.test(id)) return null;
  return path.join(resolveOutRoot(), id, 'site', '.bf', 'social-posts.json');
}

export async function readSocialPosts(spawnId: string): Promise<SocialPost[]> {
  const f = postsFile(spawnId);
  if (!f) return DEFAULT;
  try {
    const raw = await readFile(f, 'utf8');
    const parsed = JSON.parse(raw) as SocialPost[];
    return Array.isArray(parsed) ? parsed : DEFAULT;
  } catch { return DEFAULT; }
}

export async function writeSocialPosts(spawnId: string, posts: SocialPost[]): Promise<void> {
  const f = postsFile(spawnId);
  if (!f) throw new Error('invalid spawn id');
  await mkdir(path.dirname(f), { recursive: true });
  await writeFile(f, JSON.stringify(posts, null, 2), 'utf8');
}
