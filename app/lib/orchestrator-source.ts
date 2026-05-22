// app/lib/orchestrator-source.ts
//
// Auto-130b: data-source abstraction for the dashboard. Most pages
// historically read orchestrator state directly from local disk via
// `readFile(out/<slug>/...)`. That works when the dashboard runs on
// the same machine as the orchestrator (dev, single-box deploy). For
// the Vercel + Hetzner split (Auto-130) the dashboard runs on Vercel
// with NO local disk, and the orchestrator with the disk lives on
// Hetzner — so the dashboard has to fetch instead of read.
//
// This module exposes one shape that switches based on env:
//
//   readJsonlRows<T>(slug, name)   → T[]    e.g. 'bookings.jsonl'
//   readJsonCell<T>(slug, name)    → T|null e.g. '.cells/site-forge.hero.json'
//   listCells(slug)                → string[]
//
// When `ORCHESTRATOR_URL` is unset → reads local disk (current behavior).
// When set → fetches the orchestrator's `/api/orchestrator/*` endpoints
// using `ORCHESTRATOR_SHARED_SECRET` as the bearer token.
//
// The orchestrator-side endpoints live in
// `app/api/orchestrator/{jsonl,cell,cells-list}/route.ts` and read the
// SAME local disk paths — which is why the same Next.js app build runs
// in BOTH places: on Hetzner it reads disk, on Vercel it never reads
// disk because the env switch routes everything through HTTP.

import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const ORCHESTRATOR_URL = process.env['ORCHESTRATOR_URL'] ?? '';
const ORCHESTRATOR_SHARED_SECRET = process.env['ORCHESTRATOR_SHARED_SECRET'] ?? '';

/** Slug shape matches `.spawn-id-map.json` slugs everywhere else. */
const SLUG_RE = /^[a-z0-9][a-z0-9.\-_]*$/i;
/** File name within a spawn's data/ or .cells/ dir — no traversal. */
const NAME_RE = /^[a-z0-9][a-z0-9.\-_]*$/i;

function outRoot(): string {
  return process.env['BUSINESS_FORGE_OUT_DIR'] ?? resolve(process.cwd(), 'out');
}

/** Whether the dashboard should fetch state from a remote orchestrator
 *  instead of reading local disk. Vercel-side after Auto-130 lands. */
export function isRemote(): boolean {
  return ORCHESTRATOR_URL.length > 0;
}

async function fetchFromOrchestrator<T>(path: string): Promise<T> {
  const url = `${ORCHESTRATOR_URL.replace(/\/$/, '')}${path}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (ORCHESTRATOR_SHARED_SECRET) {
    headers['Authorization'] = `Bearer ${ORCHESTRATOR_SHARED_SECRET}`;
  }
  const res = await fetch(url, { headers, cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`orchestrator ${path} → ${res.status}`);
  }
  return (await res.json()) as T;
}

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Read every row from a spawn's `site/data/<name>` JSONL ledger.
 * Returns [] when the file is missing (matches local-disk readJsonl
 * behavior the loaders already rely on).
 */
export async function readJsonlRows<T>(slug: string, name: string): Promise<T[]> {
  if (!SLUG_RE.test(slug) || !NAME_RE.test(name)) return [];
  if (!isRemote()) return readJsonlLocal<T>(slug, name);

  try {
    const body = await fetchFromOrchestrator<{ ok: true; rows: T[] }>(
      `/api/orchestrator/jsonl?slug=${encodeURIComponent(slug)}&name=${encodeURIComponent(name)}`,
    );
    return body.rows;
  } catch {
    // Don't surface remote failures into the dashboard — render with
    // empty data and let the operator know via a separate health
    // indicator (TBD). Silent-empty matches the local fallback.
    return [];
  }
}

/**
 * Read one of a spawn's `.cells/<name>` JSON cells.
 * Returns null when missing (matches local readCell behavior).
 */
export async function readJsonCell<T>(slug: string, name: string): Promise<T | null> {
  if (!SLUG_RE.test(slug) || !NAME_RE.test(name)) return null;
  if (!isRemote()) return readCellLocal<T>(slug, name);

  try {
    const body = await fetchFromOrchestrator<{ ok: true; cell: T | null }>(
      `/api/orchestrator/cell?slug=${encodeURIComponent(slug)}&name=${encodeURIComponent(name)}`,
    );
    return body.cell;
  } catch {
    return null;
  }
}

/**
 * List the file names under a spawn's `.cells/` dir.
 * Returns [] when the dir is missing.
 */
export async function listCells(slug: string): Promise<string[]> {
  if (!SLUG_RE.test(slug)) return [];
  if (!isRemote()) return listCellsLocal(slug);

  try {
    const body = await fetchFromOrchestrator<{ ok: true; files: string[] }>(
      `/api/orchestrator/cells-list?slug=${encodeURIComponent(slug)}`,
    );
    return body.files;
  } catch {
    return [];
  }
}

// ── Local-disk fallback (unchanged behavior on Hetzner / dev) ──────────

async function readJsonlLocal<T>(slug: string, name: string): Promise<T[]> {
  const path = resolve(outRoot(), slug, 'site', 'data', name);
  try {
    const raw = await readFile(path, 'utf-8');
    return raw
      .split('\n')
      .filter((l) => l.trim().length > 0)
      .map((l) => { try { return JSON.parse(l) as T; } catch { return null; } })
      .filter((x): x is T => x !== null);
  } catch { return []; }
}

async function readCellLocal<T>(slug: string, name: string): Promise<T | null> {
  const path = resolve(outRoot(), slug, '.cells', name);
  try {
    return JSON.parse(await readFile(path, 'utf-8')) as T;
  } catch { return null; }
}

async function listCellsLocal(slug: string): Promise<string[]> {
  const dir = resolve(outRoot(), slug, '.cells');
  try {
    return (await readdir(dir)).filter((f) => f.endsWith('.json'));
  } catch { return []; }
}
