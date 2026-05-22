// ════════════════════════════════════════════════════════════════════════════
// Server-side crm-spawn loader — sibling of payment-loader / email-loader.
//
// Reads the spawn out-dir for the contextual data the /s/customers surface
// hangs off of:
//   - operator-view.json   → crm-spawn card (active, health, last fired)
//   - supabase/manifest    → schemaName for this spawn
//   - .cells/crm-spawn.*   → AI-authored cell records (drip composer +
//                            future contact-enricher / lead-scorer cells)
//
// The CustomersEditor is owned by a parallel session; this loader gives
// the surrounding page (customers/page.tsx) a contextual chip showing
// "crm-spawn · bf_<...>_crm" so the operator sees which schema their
// CRM data lands in. Future Slice C-3 will surface the .cells records
// in a Cells tab inside CustomersEditor (same shape as Payment).
// ════════════════════════════════════════════════════════════════════════════
import 'server-only';

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import { resolveOutRoot } from './spawn-loader';

export interface CrmCellRecord {
  readonly cellRef: string;
  readonly authorCellId: string;
  readonly composedAt: string;
  readonly source: string;
  readonly locked: boolean;
  readonly userPromptExcerpt: string;
  readonly output: unknown;
}

export interface CrmSpawnStatus {
  readonly active: boolean;
  readonly health: 'ok' | 'warn' | 'err' | 'unknown';
  readonly summary: string;
  readonly firingEdges: number;
  readonly lastFiredAt: string | null;
  readonly proposalCount: number;
}

export interface CrmDetail {
  readonly businessId: string;
  readonly status: CrmSpawnStatus | null;
  readonly schemaName: string | null;
  readonly cells: ReadonlyArray<CrmCellRecord>;
  readonly kind: 'real' | 'empty';
}

interface RawCellRecord {
  cellRef?: string;
  authorCellId?: string;
  composedAt?: string;
  source?: string;
  locked?: boolean;
  userPrompt?: string;
  output?: unknown;
}

interface RawSupabaseManifest {
  schemas?: Array<{ schemaName?: string; ownerTool?: string }>;
}

interface RawOperatorView {
  groups?: Array<{
    cards?: Array<{
      name?: string;
      summary?: string;
      active?: boolean;
      health?: string;
      firingEdges?: number;
      lastFiredAt?: string | null;
      proposalCount?: number;
    }>;
  }>;
}

async function readJson<T>(abs: string): Promise<T | null> {
  try {
    const raw = await readFile(abs, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function readCrmCells(cellsDir: string): Promise<CrmCellRecord[]> {
  let entries: string[];
  try {
    entries = await readdir(cellsDir);
  } catch {
    return [];
  }
  const matches = entries.filter((e) => e.startsWith('crm-spawn.') && e.endsWith('.json'));
  // Fan out the per-cell reads — every /s/customers/* page mount walks
  // every crm-spawn.* cell. With brand+team+automation now writing many
  // cells per spawn, serial reads were the dominant page latency.
  const settled = await Promise.all(
    matches.map((f) => readJson<RawCellRecord>(path.join(cellsDir, f))),
  );
  const out: CrmCellRecord[] = [];
  for (const raw of settled) {
    if (!raw || typeof raw.cellRef !== 'string') continue;
    out.push({
      cellRef: raw.cellRef,
      authorCellId: raw.authorCellId ?? raw.cellRef.replace(/^crm-spawn\./, ''),
      composedAt: raw.composedAt ?? '—',
      source: raw.source ?? 'unknown',
      locked: raw.locked === true,
      userPromptExcerpt: excerpt(raw.userPrompt ?? '', 220),
      output: raw.output,
    });
  }
  out.sort((a, b) => a.cellRef.localeCompare(b.cellRef));
  return out;
}

function excerpt(s: string, max: number): string {
  const trimmed = s.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function findCrmStatus(view: RawOperatorView | null): CrmSpawnStatus | null {
  if (!view?.groups) return null;
  for (const g of view.groups) {
    for (const card of g.cards ?? []) {
      if (card.name === 'crm-spawn') {
        const health =
          card.health === 'ok' || card.health === 'warn' || card.health === 'err'
            ? card.health
            : 'unknown';
        return {
          active: card.active ?? false,
          health,
          summary: card.summary ?? '',
          firingEdges: card.firingEdges ?? 0,
          lastFiredAt: card.lastFiredAt ?? null,
          proposalCount: card.proposalCount ?? 0,
        };
      }
    }
  }
  return null;
}

function findCrmSchemaName(manifest: RawSupabaseManifest | null): string | null {
  if (!manifest?.schemas) return null;
  for (const s of manifest.schemas) {
    if (s.ownerTool === 'crm-spawn' && typeof s.schemaName === 'string') {
      return s.schemaName;
    }
  }
  return null;
}

export async function loadCrmDetail(businessId: string): Promise<CrmDetail> {
  const outRoot = resolveOutRoot();
  const base = path.join(outRoot, businessId);

  const [operatorView, supabase, cells] = await Promise.all([
    readJson<RawOperatorView>(path.join(base, 'operator-view.json')),
    readJson<RawSupabaseManifest>(path.join(base, 'supabase', 'manifest.json')),
    readCrmCells(path.join(base, '.cells')),
  ]);

  const status = findCrmStatus(operatorView);
  const schemaName = findCrmSchemaName(supabase);
  const kind: 'real' | 'empty' =
    status || schemaName || cells.length > 0 ? 'real' : 'empty';

  return {
    businessId,
    status,
    schemaName,
    cells,
    kind,
  };
}
