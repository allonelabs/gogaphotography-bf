// ════════════════════════════════════════════════════════════════════════════
// Server-side spawn loader — reads business-forge `out/<id>/` artifacts.
//
// Single source of truth for every detail-route page. Keeps per-route
// logic declarative: "give me this spawn's tools / matrix / proposals".
// Returns null when the spawn dir doesn't exist; each route decides how
// to fall back (mock fixture, 404, redirect).
// ════════════════════════════════════════════════════════════════════════════
import 'server-only';

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

export interface OperatorViewCard {
  name: string;                    // backend tool name (brand-forge, …)
  category: string;                // operator-view category slug
  summary: string;
  active: boolean;
  health: 'ok' | 'warn' | 'err' | 'unknown';
  firingEdges: number;
  lastFiredAt: string | null;
  proposalCount: number;
  hasMechanismProposals: boolean;
}

export interface OperatorView {
  computedAt: string;
  summary: {
    businessId: string;
    activeToolCount: number;
    totalToolCount: number;
    overallScore: number;
    matrixHealth: number;
    diagnoses: number;
    proposalCount: number;
    highProposals: number;
    classifierConfidence: number;
    classifierSource: string;
  };
  groups: Array<{
    category: string;
    label: string;
    cards: OperatorViewCard[];
  }>;
}

export interface MatrixNode {
  tool: string;
  version: string;
  slot: string;
  readsFrom: string[];
  active: boolean;
  health: 'ok' | 'warn' | 'err' | 'unknown';
  summary: string;
}

export interface MatrixEdge {
  from: string;
  to: string;
  kind?: string;
  reason?: string;
}

export interface Matrix {
  id: string;
  businessId: string;
  generatedAt: string;
  nodes: MatrixNode[];
  edges: MatrixEdge[];
}

export interface SiteManifest {
  apex: string;
  businessName: string;
  pages?: Array<{ path: string; title?: string; kind?: string }>;
}

export interface Classification {
  activeTools: string[];
  inactiveTools: Array<{ name: string; reason: string }>;
  domain?: { key: string; label: string };
  vertical?: { key: string; label: string };
}

export interface ImprovementProposal {
  id: string;
  kind: string;
  severity: 'low' | 'medium' | 'high';
  title: string;
  rationale: string;
  params?: Record<string, unknown>;
  applicable?: boolean;
  /** Optional — set by recent improvement-loop runs */
  target?: string;
}

export interface Improvements {
  score: {
    overall: number;
    matrixHealth: number;
    classifierConfidence: number;
    bridgeCoverage: number;
    criticalNoImpl: number;
    diagnoses: number;
    computedAt?: string;
  };
  proposals: ImprovementProposal[];
}

export interface CostEvent {
  at: string;
  toolName: string;
  provider: string;
  operation: string;
  cents: number;
  unit?: string;
  refId?: string;
  meta?: Record<string, unknown>;
}

export interface CostSnapshot {
  events: CostEvent[];
  totalCents: number;
  byProvider: Record<string, number>;
  byTool: Record<string, number>;
}

export interface CellsSummary {
  total: number;
  /** Breakdown by `source` tag — claude-authored / deterministic /
   *  cache-hit / fallback / validate-failed / locked. */
  bySource: Record<string, number>;
  /** Breakdown by tool prefix (the part before the first dot in cellRef). */
  byTool: Record<string, number>;
  /** Most recently composed cells (newest first, capped at 6). */
  recent: Array<{ cellRef: string; source: string; composedAt: string }>;
}

export interface SpawnDetail {
  id: string;
  operatorView: OperatorView;
  matrix: Matrix | null;
  siteManifest: SiteManifest | null;
  classification: Classification | null;
  improvements: Improvements | null;
  cost: CostSnapshot | null;
  cells: CellsSummary | null;
  apex: string;
  businessName: string;
  jurisdiction: string;
}

export function resolveOutRoot(): string {
  return process.env['BUSINESS_FORGE_OUT_DIR']
    ?? path.resolve(process.cwd(), 'out');
}

async function readJsonMaybe<T>(abs: string): Promise<T | null> {
  try {
    const raw = await readFile(abs, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function titleCaseFromSlug(slug: string): string {
  return slug.split('-').map((w) => w[0]?.toUpperCase() + w.slice(1)).join(' ');
}

export async function listSpawnIds(): Promise<string[]> {
  try {
    const ds = await readdir(resolveOutRoot(), { withFileTypes: true });
    return ds.filter((d) => d.isDirectory()).map((d) => d.name);
  } catch {
    return [];
  }
}

export async function loadSpawnDetail(id: string): Promise<SpawnDetail | null> {
  const outRoot = resolveOutRoot();
  const base = path.join(outRoot, id);

  const operatorView = await readJsonMaybe<OperatorView>(path.join(base, 'operator-view.json'));
  if (!operatorView) return null;

  const matrix = await readJsonMaybe<Matrix>(path.join(base, 'matrix.json'));
  const siteManifest = await readJsonMaybe<SiteManifest>(path.join(base, 'site', 'manifest.json'));
  const classification = await readJsonMaybe<Classification>(path.join(base, 'classification.json'));
  const improvements = await readJsonMaybe<Improvements>(path.join(base, 'improvements.json'));
  const cost = await readJsonMaybe<CostSnapshot>(path.join(base, 'cost.json'));
  const cells = await summarizeCells(base);

  const apex = siteManifest?.apex && siteManifest.apex.length > 0 ? siteManifest.apex : `${id}.local`;
  // Prefer the manifest's explicit businessName; otherwise fall back to the
  // titlecased spawn id. The spawn id is what the operator typed in the
  // sidebar, so this keeps the sidebar label and the breadcrumb in sync.
  const businessName = siteManifest?.businessName && siteManifest.businessName.length > 0
    ? siteManifest.businessName
    : titleCaseFromSlug(id);
  const jurisdiction = (apex.split('.').pop() ?? '').toUpperCase().slice(0, 2) || '—';

  return {
    id,
    operatorView,
    matrix,
    siteManifest,
    classification,
    improvements,
    cost,
    cells,
    apex,
    businessName,
    jurisdiction,
  };
}

// ── Cell detail loader ──────────────────────────────────────────────────

export interface CellRecord {
  cellRef: string;
  authorCellId: string;
  systemPrompt: string;
  userPrompt: string;
  output: unknown;
  source: string;
  composedAt: string;
  locked: boolean;
}

/** Load one cellRecord from out/<id>/.cells/<cellRef>.json. */
export async function loadCellRecord(
  spawnId: string,
  cellRef: string,
): Promise<CellRecord | null> {
  // cellRef must be safe — kebab segments + dots, no `..`, no slashes.
  if (!/^[a-z0-9][a-z0-9.\-_]*$/i.test(cellRef) || cellRef.includes('..')) {
    return null;
  }
  const filePath = path.join(resolveOutRoot(), spawnId, '.cells', `${cellRef}.json`);
  return readJsonMaybe<CellRecord>(filePath);
}

async function summarizeCells(base: string): Promise<CellsSummary | null> {
  const cellsDir = path.join(base, '.cells');
  let entries: string[];
  try {
    entries = await readdir(cellsDir);
  } catch {
    return null;
  }
  const jsons = entries.filter((e) => e.endsWith('.json'));
  if (jsons.length === 0) return null;

  // Fan out the per-cell reads — every spawn detail page mounts walks
  // every cell record. Serializing N awaits made this scale linearly
  // with cell count; with brand+team+automation now writing many cells
  // per spawn, this is one of the heaviest paths.
  const parsed = await Promise.all(
    jsons.map(async (file) => {
      const cellRef = file.replace(/\.json$/, '');
      const tool = cellRef.split('.')[0]!;
      try {
        const raw = await readFile(path.join(cellsDir, file), 'utf8');
        const p = JSON.parse(raw) as { source?: string; composedAt?: string };
        return {
          cellRef,
          tool,
          source: p.source ?? 'unknown',
          composedAt: p.composedAt ?? '',
        };
      } catch {
        return { cellRef, tool, source: 'unknown', composedAt: '' };
      }
    }),
  );

  const bySource: Record<string, number> = {};
  const byTool: Record<string, number> = {};
  const recentRaw: Array<{ cellRef: string; source: string; composedAt: string }> = [];
  for (const p of parsed) {
    bySource[p.source] = (bySource[p.source] ?? 0) + 1;
    byTool[p.tool] = (byTool[p.tool] ?? 0) + 1;
    recentRaw.push({ cellRef: p.cellRef, source: p.source, composedAt: p.composedAt });
  }

  recentRaw.sort((a, b) => (a.composedAt < b.composedAt ? 1 : -1));

  return {
    total: jsons.length,
    bySource,
    byTool,
    recent: recentRaw.slice(0, 6),
  };
}
