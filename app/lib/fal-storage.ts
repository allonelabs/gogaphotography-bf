// Server-only fal.ai storage helper. Reads a local file from disk and uploads
// it to fal.ai's storage so the resulting public URL can be fed to any fal.ai
// queue endpoint that expects a `*_url` parameter (image_url, video_url, etc).
//
// Slice 7.5 of the v1 plan — unblocks items 83/84/90 which all need a
// public source-video URL fal.ai workers can pull.
import 'server-only';

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { fal } from '@fal-ai/client';

import { resolveOutRoot } from './spawn-loader';
import { VALID_SPAWN_ID } from './video-projects-store';

let configured = false;
function ensureConfigured(): boolean {
  const key = process.env['FAL_KEY'];
  if (!key) return false;
  if (!configured) {
    fal.config({ credentials: key });
    configured = true;
  }
  return true;
}

const MIME: Record<string, string> = {
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
  '.mov':  'video/quicktime',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.webp': 'image/webp',
  '.gif':  'image/gif',
};

/** Resolves a relative public path (e.g. "/videos/foo.mp4") to its absolute
 *  on-disk location under the spawn's site/public/ root. */
function resolvePublicAsset(spawnId: string, publicPath: string): string | null {
  if (!VALID_SPAWN_ID.test(spawnId)) return null;
  // Strip leading slash and reject absolute or parent-traversal paths.
  const rel = publicPath.replace(/^\/+/, '');
  if (rel.includes('..') || rel.startsWith('/')) return null;
  if (!/^(videos|audio|images|exports)\//i.test(rel)) return null;
  return path.join(resolveOutRoot(), spawnId, 'site', 'public', rel);
}

/** Uploads a local public asset to fal.ai storage and returns the resulting
 *  publicly fetchable URL. Returns null if FAL_KEY is missing or the file
 *  isn't found. Throws on upload failure so callers can surface the message. */
export async function uploadPublicAssetToFal(spawnId: string, publicPath: string): Promise<string | null> {
  if (!ensureConfigured()) return null;
  const abs = resolvePublicAsset(spawnId, publicPath);
  if (!abs) return null;

  let data: Buffer;
  try { data = await readFile(abs); }
  catch { return null; }

  const ext = path.extname(abs).toLowerCase();
  const mime = MIME[ext] ?? 'application/octet-stream';
  const filename = path.basename(abs);

  // The fal client's storage.upload accepts Blob/File. Wrap the buffer.
  const blob = new Blob([new Uint8Array(data)], { type: mime });
  // The File constructor is available in Node 20+ globals.
  const file = new File([blob], filename, { type: mime });
  const url = await fal.storage.upload(file);
  return url;
}
