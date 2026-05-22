// ════════════════════════════════════════════════════════════════════════════
// versions-store — snapshot / list / restore the spawned site's source files.
//
// Layout under each spawn:
//   out/<id>/site/.bf/versions/
//     ├─ <vid>/              ← full copy of app/ + public/ + lib/ + .bf/forms.json
//     │   ├─ manifest.json   ← { vid, label, createdAt, byteCount, fileCount }
//     │   ├─ app/...
//     │   ├─ public/...
//     │   └─ lib/...
//     └─ <vid>/...
//
// Snapshots are full file-copies (no zip — keeps cross-platform-portable; the
// directory is small). Restore overwrites the live tree from a chosen snapshot.
// We DO NOT snapshot node_modules, .next, .turbo — those are derived.
// ════════════════════════════════════════════════════════════════════════════
import 'server-only';

import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { resolveOutRoot } from './spawn-loader';

export const VALID_SPAWN_ID = /^[a-z0-9][a-z0-9.\-_]*$/i;

const SNAPSHOTTED_PATHS = ['app', 'public', 'lib'] as const;
const EXCLUDE_DIRS = new Set(['node_modules', '.next', '.turbo', 'dist', '.git']);

export interface VersionManifest {
  vid: string;
  label: string;
  createdAt: string;
  fileCount: number;
  byteCount: number;
}

export function siteRoot(spawnId: string): string | null {
  if (!VALID_SPAWN_ID.test(spawnId)) return null;
  return path.join(resolveOutRoot(), spawnId, 'site');
}

export function versionsDir(spawnId: string): string | null {
  const site = siteRoot(spawnId);
  if (!site) return null;
  return path.join(site, '.bf', 'versions');
}

export async function listVersions(spawnId: string): Promise<VersionManifest[]> {
  const dir = versionsDir(spawnId);
  if (!dir) return [];
  let names: string[] = [];
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }
  const out: VersionManifest[] = [];
  for (const n of names) {
    const m = await readManifest(spawnId, n);
    if (m) out.push(m);
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function readManifest(spawnId: string, vid: string): Promise<VersionManifest | null> {
  const dir = versionsDir(spawnId);
  if (!dir) return null;
  try {
    const raw = await readFile(path.join(dir, vid, 'manifest.json'), 'utf8');
    return JSON.parse(raw) as VersionManifest;
  } catch {
    return null;
  }
}

export async function createSnapshot(spawnId: string, label: string): Promise<VersionManifest> {
  const site = siteRoot(spawnId);
  const dir = versionsDir(spawnId);
  if (!site || !dir) throw new Error('invalid spawn id');

  const vid = `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const dest = path.join(dir, vid);
  await mkdir(dest, { recursive: true });

  let fileCount = 0;
  let byteCount = 0;

  for (const sub of SNAPSHOTTED_PATHS) {
    const src = path.join(site, sub);
    try {
      await stat(src); // existence check; throws if missing
    } catch {
      continue;
    }
    await cp(src, path.join(dest, sub), {
      recursive: true,
      filter: (entry) => {
        const base = path.basename(entry);
        if (EXCLUDE_DIRS.has(base)) return false;
        return true;
      },
    });
    const counted = await countTree(path.join(dest, sub));
    fileCount += counted.files;
    byteCount += counted.bytes;
  }

  // Also snapshot the .bf data files (forms.json, custom-scripts.json, etc.)
  // — they're operator-edited config, not derived.
  try {
    const bfSrc = path.join(site, '.bf');
    const bfNames = await readdir(bfSrc);
    const bfFiles = bfNames.filter((n) => n.endsWith('.json') || n.endsWith('.jsonl'));
    if (bfFiles.length > 0) {
      const bfDest = path.join(dest, '.bf');
      await mkdir(bfDest, { recursive: true });
      // Fan out the per-file copies — sequential cp+stat was the dominant
      // cost when the operator-edited .bf config grew to dozens of files
      // (forms, custom scripts, ledger config, etc.).
      const sizes = await Promise.all(
        bfFiles.map(async (f) => {
          await cp(path.join(bfSrc, f), path.join(bfDest, f));
          const s = await stat(path.join(bfDest, f));
          return s.size;
        }),
      );
      fileCount += sizes.length;
      for (const sz of sizes) byteCount += sz;
    }
  } catch {
    // .bf may not exist on first snapshot — fine
  }

  const manifest: VersionManifest = {
    vid,
    label: label.slice(0, 80) || `Snapshot ${new Date().toLocaleString()}`,
    createdAt: new Date().toISOString(),
    fileCount,
    byteCount,
  };
  await writeFile(path.join(dest, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  return manifest;
}

export async function restoreSnapshot(spawnId: string, vid: string): Promise<VersionManifest> {
  const site = siteRoot(spawnId);
  const dir = versionsDir(spawnId);
  if (!site || !dir) throw new Error('invalid spawn id');
  if (!/^v_[a-z0-9_]+$/i.test(vid)) throw new Error('invalid vid');

  const src = path.join(dir, vid);
  const manifest = await readManifest(spawnId, vid);
  if (!manifest) throw new Error('snapshot not found');

  // Take a "before-restore" auto-snapshot so the operator can undo the undo.
  await createSnapshot(spawnId, `auto · before restoring ${manifest.label}`);

  // Replace each snapshotted top-level dir. The dirs (pages, public,
  // etc.) are disjoint, so per-path rm-then-cp can fan out across paths.
  await Promise.all(
    SNAPSHOTTED_PATHS.map(async (sub) => {
      const live = path.join(site, sub);
      const snap = path.join(src, sub);
      try { await stat(snap); } catch { return; } // not in this snapshot
      await rm(live, { recursive: true, force: true });
      await cp(snap, live, { recursive: true });
    }),
  );

  // Restore .bf config files (but NOT the versions/ subdir itself!)
  try {
    const bfSrc = path.join(src, '.bf');
    const bfNames = await readdir(bfSrc);
    const restorable = bfNames.filter((f) => f !== 'versions');
    // Fan out the per-file copies for the same reason as createSnapshot.
    await Promise.all(
      restorable.map((f) => cp(path.join(bfSrc, f), path.join(site, '.bf', f))),
    );
  } catch {
    // no .bf in snapshot — fine
  }

  return manifest;
}

export async function deleteSnapshot(spawnId: string, vid: string): Promise<boolean> {
  const dir = versionsDir(spawnId);
  if (!dir) return false;
  if (!/^v_[a-z0-9_]+$/i.test(vid)) return false;
  await rm(path.join(dir, vid), { recursive: true, force: true });
  return true;
}

async function countTree(p: string): Promise<{ files: number; bytes: number }> {
  let files = 0;
  let bytes = 0;
  async function walk(cur: string): Promise<void> {
    const names = await readdir(cur);
    for (const n of names) {
      if (EXCLUDE_DIRS.has(n)) continue;
      const child = path.join(cur, n);
      const s = await stat(child);
      if (s.isDirectory()) await walk(child);
      else { files += 1; bytes += s.size; }
    }
  }
  try { await walk(p); } catch { /* missing dir, fine */ }
  return { files, bytes };
}
