// ════════════════════════════════════════════════════════════════════════════
// video-collab-store — frame-pinned comments + project version history.
//
// Comments live in   .bf/video-comments.jsonl       (append-only)
// Versions live in   .bf/video-versions/<projectId>/<isoSafe>.json
//
// Slice 9 of the v1 plan. Both surfaces share the same per-spawn
// disk root used by video-projects-store, so a clone of the spawn dir
// carries collab state with it.
// ════════════════════════════════════════════════════════════════════════════
import 'server-only';

import { appendFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { withFileMutex } from './file-mutex';
import { resolveOutRoot } from './spawn-loader';
import type { VideoProject } from './video-projects-store';
import { VALID_SPAWN_ID } from './video-projects-store';

// ── Frame-pinned comments ────────────────────────────────────────────────

export interface VideoComment {
  id: string;
  projectId: string;
  /** Frame the comment is anchored to. Renders as a marker on the playhead bar. */
  atFrame: number;
  text: string;
  /** Author label — operator name / email / handle. Free-form for now. */
  by: string;
  /** ISO timestamp. */
  createdAt: string;
  /** Resolved comments stay in the JSONL but render dimmed. */
  resolved?: boolean;
}

function commentsFile(spawnId: string): string | null {
  if (!VALID_SPAWN_ID.test(spawnId)) return null;
  return path.join(resolveOutRoot(), spawnId, 'site', '.bf', 'video-comments.jsonl');
}

export async function readComments(spawnId: string, projectId?: string, limit = 500): Promise<VideoComment[]> {
  const f = commentsFile(spawnId);
  if (!f) return [];
  try {
    const raw = await readFile(f, 'utf8');
    const lines = raw.split('\n').filter((l) => l.trim().length > 0);
    const all = lines.map((l) => JSON.parse(l) as VideoComment);
    const filtered = projectId ? all.filter((c) => c.projectId === projectId) : all;
    return filtered.slice(-limit).reverse();
  } catch { return []; }
}

export async function appendComment(spawnId: string, c: VideoComment): Promise<void> {
  const f = commentsFile(spawnId);
  if (!f) throw new Error('invalid spawn id');
  await mkdir(path.dirname(f), { recursive: true });
  return withFileMutex(f, async () => {
    await appendFile(f, JSON.stringify(c) + '\n', 'utf8');
  });
}

export async function patchComment(spawnId: string, id: string, patch: Partial<VideoComment>): Promise<void> {
  const f = commentsFile(spawnId);
  if (!f) return;
  return withFileMutex(f, async () => {
    let raw: string;
    try { raw = await readFile(f, 'utf8'); } catch { return; }
    const lines = raw.split('\n').filter((l) => l.trim().length > 0);
    let touched = false;
    const next = lines.map((l) => {
      try {
        const row = JSON.parse(l) as VideoComment;
        if (row.id === id) { touched = true; return JSON.stringify({ ...row, ...patch }); }
        return l;
      } catch { return l; }
    });
    if (!touched) return;
    await writeFile(f, next.join('\n') + '\n', 'utf8');
  });
}

// ── Project version history ──────────────────────────────────────────────

export interface VideoVersion {
  /** Filename without extension — sortable ISO ts. */
  key: string;
  savedAt: string;
  /** Operator-provided label (optional). */
  label?: string;
  /** Bytes on disk — useful for the listing UI. */
  bytes: number;
}

function versionsDir(spawnId: string, projectId: string): string | null {
  if (!VALID_SPAWN_ID.test(spawnId)) return null;
  if (!/^[a-zA-Z0-9._-]+$/.test(projectId)) return null;
  return path.join(resolveOutRoot(), spawnId, 'site', '.bf', 'video-versions', projectId);
}

function isoKey(): string {
  // Filename-safe: replace : and . with - so listing/sorting stays simple.
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export async function snapshotVersion(
  spawnId: string,
  project: VideoProject,
  label?: string,
): Promise<VideoVersion | null> {
  const dir = versionsDir(spawnId, project.id);
  if (!dir) return null;
  await mkdir(dir, { recursive: true });
  const key = isoKey();
  const payload = JSON.stringify({ savedAt: new Date().toISOString(), label, project }, null, 2);
  await writeFile(path.join(dir, `${key}.json`), payload, 'utf8');
  return { key, savedAt: new Date().toISOString(), label, bytes: Buffer.byteLength(payload) };
}

export async function listVersions(spawnId: string, projectId: string): Promise<VideoVersion[]> {
  const dir = versionsDir(spawnId, projectId);
  if (!dir) return [];
  let entries: string[];
  try { entries = await readdir(dir); } catch { return []; }
  const out: VideoVersion[] = [];
  for (const name of entries) {
    if (!name.endsWith('.json')) continue;
    try {
      const raw = await readFile(path.join(dir, name), 'utf8');
      const parsed = JSON.parse(raw) as { savedAt?: string; label?: string };
      out.push({
        key: name.replace(/\.json$/, ''),
        savedAt: parsed.savedAt ?? '',
        label: parsed.label,
        bytes: Buffer.byteLength(raw),
      });
    } catch { /* skip corrupt entry */ }
  }
  return out.sort((a, b) => (b.savedAt > a.savedAt ? 1 : -1));
}

export async function readVersion(spawnId: string, projectId: string, key: string): Promise<VideoProject | null> {
  const dir = versionsDir(spawnId, projectId);
  if (!dir) return null;
  if (!/^[a-zA-Z0-9-]+$/.test(key)) return null;
  try {
    const raw = await readFile(path.join(dir, `${key}.json`), 'utf8');
    const parsed = JSON.parse(raw) as { project?: VideoProject };
    return parsed.project ?? null;
  } catch { return null; }
}
