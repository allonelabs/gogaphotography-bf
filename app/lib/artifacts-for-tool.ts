// ════════════════════════════════════════════════════════════════════════════
// Real artifact lister — walks `out/<id>/.cells/*.json` for authored cells
// and the materialized `site/`, `email/`, `supabase/`, `storage/` trees
// for materialized outputs, emitting one `MockArtifact`-shaped record per
// real file, grouped by tool slug.
//
// This is the operator's view of "what did this tool actually produce?" —
// every record corresponds to a concrete file on disk under the spawn's
// output tree. No synthesis, no padding.
// ════════════════════════════════════════════════════════════════════════════
import 'server-only';

import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

import type { ArtifactKind, MockArtifact } from '../data/mock-artifacts';
import { resolveOutRoot } from './spawn-loader';

// ── Tool → materialized path patterns ────────────────────────────────────
//
// Which subtrees of `out/<id>/` each backend tool tends to produce into.
// Multiple tools can map to the same subtree (site-forge + media-forge
// both land in `site/`) — we bucket by path prefix when that happens.

interface MaterializedBucket {
  /** Path prefix inside out/<id>/ (e.g. `site/app`, `email`). */
  prefix: string;
  /** Kind for the artifact records emitted from this bucket. */
  kind: ArtifactKind;
  /** Tool slugs that claim files under this prefix. */
  tools: readonly string[];
}

const BUCKETS: readonly MaterializedBucket[] = [
  { prefix: 'site/app',         kind: 'page',           tools: ['site-forge', 'app-forge'] },
  { prefix: 'site/public',      kind: 'image',          tools: ['media-forge'] },
  { prefix: 'email',            kind: 'email-template', tools: ['email-forge'] },
  { prefix: 'supabase',         kind: 'migration',      tools: ['ecom-forge', 'crm-spawn', 'ledger-spawn', 'admin-spawn'] },
  { prefix: 'storage',          kind: 'config',         tools: ['media-forge', 'backup-forge'] },
  { prefix: 'ads',              kind: 'copy',           tools: ['ad-reel'] },
  { prefix: 'admin',            kind: 'config',         tools: ['admin-spawn'] },
  { prefix: 'brand',            kind: 'brand-asset',    tools: ['brand-forge'] },
];

async function walk(root: string, base = ''): Promise<Array<{ rel: string; mtimeMs: number; size: number }>> {
  let entries;
  try {
    entries = await readdir(path.join(root, base), { withFileTypes: true });
  } catch {
    return []; // missing subtree
  }
  // Fan out the per-entry work — recurse into dirs in parallel and stat
  // files in parallel. The artifacts surface walks the whole site/app/db
  // bucket per tool selection, which on a populated spawn was hundreds of
  // serial stat calls.
  const promises = entries.map(async (e): Promise<Array<{ rel: string; mtimeMs: number; size: number }>> => {
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.next') return [];
      return walk(root, rel);
    }
    const s = await stat(path.join(root, rel));
    return [{ rel, mtimeMs: s.mtimeMs, size: s.size }];
  });
  const settled = await Promise.all(promises);
  return settled.flat();
}

function fmtAgo(ms: number): string {
  const diff = Math.max(0, Date.now() - ms);
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function fmtIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Return every artifact this tool produced in this spawn. Combines
 * authored cells (`.cells/<tool>.*.json`) with materialized files under
 * each bucket this tool is responsible for.
 */
export async function realArtifactsFor(
  businessId: string,
  toolSlug: string,
  max = 8,
): Promise<MockArtifact[]> {
  const base = path.join(resolveOutRoot(), businessId);
  const out: MockArtifact[] = [];

  // Authored cells — the AI-produced pieces.
  const cellsDir = path.join(base, '.cells');
  try {
    const entries = await readdir(cellsDir, { withFileTypes: true });
    const matchingCells = entries.filter(
      (e) => e.isFile() && e.name.endsWith('.json') && e.name.startsWith(`${toolSlug}.`),
    );
    // Fan out the per-cell stat calls.
    const cellRows = await Promise.all(
      matchingCells.map(async (e) => {
        const full = path.join(cellsDir, e.name);
        const s = await stat(full);
        return {
          id: `cell-${e.name}`,
          businessId,
          tool: toolSlug,
          kind: 'copy' as const,
          name: e.name.replace(/\.json$/, ''),
          path: `.cells/${e.name}`,
          size: fmtSize(s.size),
          source: 'claude-authored' as const,
          locked: false,
          createdAt: fmtIso(s.mtimeMs),
          updatedAt: fmtAgo(s.mtimeMs),
          version: 1,
        } satisfies MockArtifact;
      }),
    );
    out.push(...cellRows);
  } catch { /* no cells dir */ }

  // Materialized artifacts — files this tool tends to land. The buckets
  // for a single tool target disjoint subtrees, so the walks can fan out.
  const matchingBuckets = BUCKETS.filter((b) => b.tools.includes(toolSlug));
  const bucketResults = await Promise.all(
    matchingBuckets.map(async (bucket) => ({
      bucket,
      files: await walk(path.join(base, bucket.prefix)),
    })),
  );
  for (const { bucket, files } of bucketResults) {
    for (const f of files) {
      out.push({
        id: `mat-${bucket.prefix}-${f.rel.replace(/[\/.]/g, '-')}`,
        businessId,
        tool: toolSlug,
        kind: bucket.kind,
        name: f.rel,
        path: `${bucket.prefix}/${f.rel}`,
        size: fmtSize(f.size),
        source: 'claude-authored',
        locked: false,
        createdAt: fmtIso(f.mtimeMs),
        updatedAt: fmtAgo(f.mtimeMs),
        version: 1,
      });
    }
  }

  // Newest first, capped.
  out.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return out.slice(0, max);
}
