// ════════════════════════════════════════════════════════════════════════════
// Server-side automation loader — surfaces /s/automations/* against real
// automation-forge cells when present, mock fixture otherwise.
//
// Real-cells walk: <out>/<spawnId>/.cells/automation-forge.workflow.<id>.json
//                  <out>/<spawnId>/.cells/automation-forge.execution.<id>.json
//                  <out>/<spawnId>/.cells/automation-forge.oauth.<vendor>.json
// On-disk shape mirrors the UI types so the round-trip is one writeJson /
// readJson — no translation layer.
// ════════════════════════════════════════════════════════════════════════════
import 'server-only';

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  mockAutomations,
  type AutomationFixture,
  type AutomationWorkflowDetail,
  type AutomationExecution,
  type OAuthVendor,
} from '../data/mock-automations';
import { resolveOutRoot } from './spawn-loader';

export type {
  AutomationFixture,
  AutomationWorkflowDetail,
  AutomationExecution,
  OAuthVendor,
  WorkflowStatus,
  QueueDepthSnapshot,
} from '../data/mock-automations';

const PREFIX = 'automation-forge.';

async function readJson<T>(abs: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(abs, 'utf8')) as T;
  } catch {
    return null;
  }
}

interface CellsRead {
  workflows: AutomationWorkflowDetail[];
  executions: AutomationExecution[];
  oauthVendors: OAuthVendor[];
}

async function readCells(spawnId: string): Promise<CellsRead | null> {
  if (!/^[a-z0-9][a-z0-9.\-_]*$/i.test(spawnId)) return null;
  const dir = path.join(resolveOutRoot(), spawnId, '.cells');
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return null;
  }

  // Pre-classify by filename so we can fan out the JSON reads — every
  // /s/automations/* page mounts re-reads every cell, and the loader
  // was previously serializing a workflow.json + 50 execution.json
  // reads per page-load.
  interface Pending { kind: 'workflow' | 'execution' | 'oauth'; abs: string }
  const pending: Pending[] = [];
  for (const f of files) {
    if (!f.startsWith(PREFIX) || !f.endsWith('.json')) continue;
    const stem = f.slice(PREFIX.length, -'.json'.length);
    const [kind] = stem.split('.', 1);
    if (kind !== 'workflow' && kind !== 'execution' && kind !== 'oauth') continue;
    pending.push({ kind, abs: path.join(dir, f) });
  }
  const parsed = await Promise.all(pending.map(async (p) => ({ kind: p.kind, value: await readJson<unknown>(p.abs) })));
  const out: CellsRead = { workflows: [], executions: [], oauthVendors: [] };
  for (const p of parsed) {
    if (!p.value) continue;
    if (p.kind === 'workflow') {
      const w = p.value as AutomationWorkflowDetail;
      if (typeof w.id === 'string') out.workflows.push(w);
    } else if (p.kind === 'execution') {
      const e = p.value as AutomationExecution;
      if (typeof e.id === 'string') out.executions.push(e);
    } else {
      const v = p.value as OAuthVendor;
      if (typeof v.vendor === 'string') out.oauthVendors.push(v);
    }
  }

  out.workflows.sort((a, b) => (b.lastFiredAt ?? '').localeCompare(a.lastFiredAt ?? ''));
  out.executions.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return out;
}

export async function loadAutomationDetail(spawnId: string): Promise<AutomationFixture> {
  const real = await readCells(spawnId);
  if (real && (real.workflows.length > 0 || real.executions.length > 0)) {
    return {
      workflows: real.workflows.length > 0 ? real.workflows : mockAutomations.workflows,
      executions: real.executions,
      oauthVendors: real.oauthVendors.length > 0 ? real.oauthVendors : mockAutomations.oauthVendors,
      queueDepth: mockAutomations.queueDepth,           // synthetic for now
      totalCostUsd30d:
        real.workflows.length > 0
          ? real.workflows.reduce((s, w) => s + w.costUsd30d, 0)
          : mockAutomations.totalCostUsd30d,
      tenantCapUsd: mockAutomations.tenantCapUsd,
      provider: 'inngest',
      isFixture: false,
    };
  }
  return mockAutomations;
}

// ── small derived selectors ───────────────────────────────────────────

export function rollupHealth(detail: AutomationFixture): {
  enabled: number;
  paused: number;
  failed: number;
  draft: number;
  fires24h: number;
  failures24h: number;
  successRate24h: number;
} {
  let enabled = 0, paused = 0, failed = 0, draft = 0;
  let fires = 0, fails = 0;
  for (const w of detail.workflows) {
    if (w.status === 'enabled') enabled += 1;
    else if (w.status === 'paused') paused += 1;
    else if (w.status === 'failed') failed += 1;
    else draft += 1;
    fires += w.fired24h;
    fails += w.failed24h;
  }
  const successRate24h = fires === 0 ? 100 : Math.round(((fires - fails) / fires) * 1000) / 10;
  return { enabled, paused, failed, draft, fires24h: fires, failures24h: fails, successRate24h };
}

export function workflowById(
  detail: AutomationFixture,
  id: string,
): AutomationWorkflowDetail | null {
  return detail.workflows.find((w) => w.id === id) ?? null;
}

export function executionsForWorkflow(
  detail: AutomationFixture,
  id: string,
): AutomationExecution[] {
  return detail.executions.filter((e) => e.workflowId === id);
}
