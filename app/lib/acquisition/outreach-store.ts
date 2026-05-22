// Read/update helpers for outreach.jsonl. The orchestrator appends drafts
// here (Slice 3); the API endpoints below read + flip status (pending →
// approved/rejected/sent) and the dispatcher actually sends.
//
// JSONL is append-only by convention, so updates work by appending a
// new row with the same id + later generatedAt — readers pick the
// last-write-wins row per id.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { resolveOutRoot } from '../spawn-loader';
import type { OutreachDraft } from './content-gen';

export async function readOutreach(spawnId: string): Promise<OutreachDraft[]> {
  try {
    const file = path.join(resolveOutRoot(), spawnId, '.acquisition', 'outreach.jsonl');
    const raw = await fs.readFile(file, 'utf-8');
    // Last-write-wins by id: walk the file in order, replace any prior
    // entry with the same id when a newer one appears.
    const byId = new Map<string, OutreachDraft>();
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      try {
        const d = JSON.parse(line) as OutreachDraft;
        if (d.id) byId.set(d.id, d);
      } catch { /* skip malformed */ }
    }
    return [...byId.values()];
  } catch {
    return [];
  }
}

/**
 * Append an updated copy of a draft so readers see the new status.
 * Returns the updated row, or null if the original wasn't found.
 */
export async function updateOutreach(
  spawnId: string,
  draftId: string,
  patch: Partial<Pick<OutreachDraft, 'status' | 'email' | 'social'>>,
): Promise<OutreachDraft | null> {
  const current = await readOutreach(spawnId);
  const existing = current.find((d) => d.id === draftId);
  if (!existing) return null;
  const updated: OutreachDraft = {
    ...existing,
    ...patch,
    generatedAt: new Date().toISOString(),
  };
  const file = path.join(resolveOutRoot(), spawnId, '.acquisition', 'outreach.jsonl');
  await fs.appendFile(file, JSON.stringify(updated) + '\n', 'utf-8');
  return updated;
}
