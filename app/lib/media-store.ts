// ════════════════════════════════════════════════════════════════════════════
// media-store — server-only persistence for the spawned site's image library.
//
// Layout:
//   out/<id>/site/public/images/<safeName>     ← actual image files
//   out/<id>/site/.bf/media.json               ← per-image metadata
//
// Public images are served directly by the Next.js spawned site at
// `/images/<name>` thanks to Next's `public/` convention. The metadata
// (alt-text, focal point, original size) lives in `.bf/media.json` so the
// composer can fetch it later for hero/section components.
// ════════════════════════════════════════════════════════════════════════════
import 'server-only';

import { mkdir, readFile, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { resolveOutRoot } from './spawn-loader';

export const VALID_SPAWN_ID = /^[a-z0-9][a-z0-9.\-_]*$/i;
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.svg']);
const MAX_SIZE_BYTES = 12 * 1024 * 1024; // 12 MB
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png':  '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/gif':  '.gif',
  'image/svg+xml': '.svg',
};

export interface MediaItem {
  /** Filename in public/images/. Used as the URL path: /images/<name>. */
  name: string;
  altText: string;
  /** 0-100 focal points; default 50/50 = center. */
  focalX: number;
  focalY: number;
  byteCount: number;
  width?: number;
  height?: number;
  uploadedAt: string;
  contentType: string;
}

export const MAX_UPLOAD_BYTES = MAX_SIZE_BYTES;

export function publicImagesDir(spawnId: string): string | null {
  if (!VALID_SPAWN_ID.test(spawnId)) return null;
  return path.join(resolveOutRoot(), spawnId, 'site', 'public', 'images');
}

export function metadataFile(spawnId: string): string | null {
  if (!VALID_SPAWN_ID.test(spawnId)) return null;
  return path.join(resolveOutRoot(), spawnId, 'site', '.bf', 'media.json');
}

export async function listMedia(spawnId: string): Promise<MediaItem[]> {
  const dir = publicImagesDir(spawnId);
  if (!dir) return [];
  let names: string[] = [];
  try { names = await readdir(dir); } catch { return []; }

  const meta = await loadMetadata(spawnId);
  const out: MediaItem[] = [];
  for (const n of names) {
    if (n.startsWith('.')) continue;
    const ext = path.extname(n).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) continue;
    let size = 0;
    try { size = (await stat(path.join(dir, n))).size; } catch { continue; }
    const m = meta[n];
    out.push({
      name: n,
      altText: m?.altText ?? '',
      focalX: m?.focalX ?? 50,
      focalY: m?.focalY ?? 50,
      byteCount: size,
      ...(m?.width !== undefined && { width: m.width }),
      ...(m?.height !== undefined && { height: m.height }),
      uploadedAt: m?.uploadedAt ?? new Date().toISOString(),
      contentType: m?.contentType ?? extToMime(ext),
    });
  }
  return out.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

interface MetadataMap { [name: string]: Partial<MediaItem> }

async function loadMetadata(spawnId: string): Promise<MetadataMap> {
  const f = metadataFile(spawnId);
  if (!f) return {};
  try {
    const raw = await readFile(f, 'utf8');
    return (JSON.parse(raw) as MetadataMap) ?? {};
  } catch { return {}; }
}

async function saveMetadata(spawnId: string, map: MetadataMap): Promise<void> {
  const f = metadataFile(spawnId);
  if (!f) throw new Error('invalid spawn id');
  await mkdir(path.dirname(f), { recursive: true });
  await writeFile(f, JSON.stringify(map, null, 2), 'utf8');
}

export async function saveUpload(
  spawnId: string,
  originalName: string,
  contentType: string,
  bytes: ArrayBuffer,
): Promise<MediaItem> {
  if (bytes.byteLength > MAX_SIZE_BYTES) throw new Error(`file too large (${bytes.byteLength} bytes; max ${MAX_SIZE_BYTES})`);
  const ext = (path.extname(originalName).toLowerCase() || MIME_TO_EXT[contentType] || '').toLowerCase();
  if (!ALLOWED_EXT.has(ext)) throw new Error(`unsupported file type (${ext || contentType})`);

  const dir = publicImagesDir(spawnId);
  if (!dir) throw new Error('invalid spawn id');
  await mkdir(dir, { recursive: true });

  const safe = sanitizeName(originalName, ext);
  const dest = path.join(dir, safe);
  await writeFile(dest, Buffer.from(bytes));

  const meta = await loadMetadata(spawnId);
  const item: MediaItem = {
    name: safe,
    altText: '',
    focalX: 50,
    focalY: 50,
    byteCount: bytes.byteLength,
    uploadedAt: new Date().toISOString(),
    contentType: contentType || extToMime(ext),
  };
  meta[safe] = item;
  await saveMetadata(spawnId, meta);
  return item;
}

export async function patchMedia(
  spawnId: string,
  name: string,
  patch: Partial<Pick<MediaItem, 'altText' | 'focalX' | 'focalY'>>,
): Promise<MediaItem | null> {
  if (!isSafeName(name)) return null;
  const meta = await loadMetadata(spawnId);
  const cur = meta[name] ?? {};
  const next: Partial<MediaItem> = {
    ...cur,
    altText: typeof patch.altText === 'string' ? patch.altText.slice(0, 512) : (cur.altText ?? ''),
    focalX:  typeof patch.focalX === 'number'  ? clamp(Math.round(patch.focalX), 0, 100) : (cur.focalX ?? 50),
    focalY:  typeof patch.focalY === 'number'  ? clamp(Math.round(patch.focalY), 0, 100) : (cur.focalY ?? 50),
  };
  meta[name] = next;
  await saveMetadata(spawnId, meta);

  const list = await listMedia(spawnId);
  return list.find((i) => i.name === name) ?? null;
}

export async function deleteMedia(spawnId: string, name: string): Promise<boolean> {
  if (!isSafeName(name)) return false;
  const dir = publicImagesDir(spawnId);
  if (!dir) return false;
  try { await unlink(path.join(dir, name)); } catch { /* missing file — fine */ }
  const meta = await loadMetadata(spawnId);
  if (meta[name]) { delete meta[name]; await saveMetadata(spawnId, meta); }
  return true;
}

function sanitizeName(orig: string, ext: string): string {
  const base = path.basename(orig, path.extname(orig))
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64) || 'image';
  return `${base}-${Date.now().toString(36)}${ext}`;
}

function isSafeName(s: string): boolean {
  return /^[a-z0-9][a-z0-9._-]*\.(jpg|jpeg|png|webp|avif|gif|svg)$/i.test(s);
}

function extToMime(ext: string): string {
  const flip = Object.entries(MIME_TO_EXT).find(([, e]) => e === ext);
  return flip?.[0] ?? 'application/octet-stream';
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
