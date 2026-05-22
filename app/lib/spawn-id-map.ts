// app/lib/spawn-id-map.ts
//
// Bidirectional resolver between the two spawn identifiers:
//   - `slug`     — operator-facing dir name under `out/<slug>/` (e.g. crema-lab-v7)
//   - `hashedId` — orchestrator-minted internal id under `.forge-vault/<hashedId>/`
//
// scripts/spawn.ts writes both sides of the map at materialize time so any
// runtime handler (Inngest step, webhook receiver, bridge dispatch) can
// translate between the two without recomputing the hash or scanning dirs.

import 'server-only';

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export interface SpawnIdMapEntry {
  readonly slug: string;
  readonly hashedId: string;
  readonly createdAt: string;
}

const OUT_ROOT = process.env['BUSINESS_FORGE_OUT_DIR'] ?? resolve(process.cwd(), 'out');
const VAULT_ROOT = process.env['BUSINESS_FORGE_VAULT_DIR'] ?? resolve(process.cwd(), '.forge-vault');

export async function readSpawnIdMapBySlug(slug: string): Promise<SpawnIdMapEntry | null> {
  return readJson<SpawnIdMapEntry>(resolve(OUT_ROOT, slug, '.spawn-id-map.json'));
}

export async function readSpawnIdMapByHashedId(hashedId: string): Promise<SpawnIdMapEntry | null> {
  return readJson<SpawnIdMapEntry>(resolve(VAULT_ROOT, hashedId, 'spawn-id.json'));
}

/**
 * Take whatever id you have (slug or hashedId) and resolve to a full entry.
 * Returns null when neither side has a map written.
 */
export async function resolveSpawnId(idOrSlug: string): Promise<SpawnIdMapEntry | null> {
  // Try slug first (the cheaper read on cell-driven flows).
  const bySlug = await readSpawnIdMapBySlug(idOrSlug);
  if (bySlug) return bySlug;
  return readSpawnIdMapByHashedId(idOrSlug);
}

async function readJson<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
