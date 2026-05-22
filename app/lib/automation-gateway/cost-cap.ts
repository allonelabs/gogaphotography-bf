// Per-tenant cost-cap enforcement — Tier-3 spec line 5.
//
// Pre-flight check before dispatch. When the rolling 30-day cost plus
// the estimated cost of the next execution would exceed the tenant's
// configured cap, refuse the dispatch and signal the operator UI.
//
// Reads execution cells from disk to compute the rolling sum. In
// production this becomes a Redis sorted-set or Postgres view; the
// `check()` contract stays identical.

import 'server-only';

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import type { AutomationExecution, AutomationWorkflowDetail } from '@/app/data/mock-automations';
import { resolveOutRoot } from '../spawn-loader';

const PREFIX = 'automation-forge.';
/** Default cap per spec §Cost ceiling. */
const DEFAULT_CAP_USD = 50;
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export interface CapCheckResult {
  allowed: boolean;
  reason?: string;
  /** Current 30d cost in USD. */
  current30d: number;
  /** Tenant cap in USD. */
  cap: number;
  /** Estimated cost of the proposed dispatch in USD. */
  estimated: number;
  /** When over cap, how many seconds until the oldest cost ticks out. */
  retryAfterSec?: number;
}

async function readExecutions(spawnId: string): Promise<AutomationExecution[]> {
  const dir = path.join(resolveOutRoot(), spawnId, '.cells');
  let files: string[];
  try { files = await readdir(dir); } catch { return []; }
  const executionFiles = files.filter(
    (f) => f.startsWith(`${PREFIX}execution.`) && f.endsWith('.json'),
  );
  // The cost-cap gate fires on every workflow dispatch — the 30-day
  // execution window can have hundreds of cell files, so serial reads
  // were the dominant pre-flight latency before a workflow could fire.
  const settled = await Promise.all(
    executionFiles.map(async (f) => {
      try {
        return JSON.parse(await readFile(path.join(dir, f), 'utf8')) as AutomationExecution;
      } catch {
        return null;
      }
    }),
  );
  return settled.filter((e): e is AutomationExecution => e !== null);
}

/** Estimate the dispatch's cost from the workflow's average per-execution cost. */
export function estimateCost(workflow: AutomationWorkflowDetail): number {
  // 30d cost ÷ 30d fires (extrapolated from 24h fires × 30) is the rough
  // average. Floor at 1¢ to avoid divide-by-zero on cold workflows.
  const fires30dEstimate = Math.max(1, workflow.fired24h * 30);
  return Math.max(0.01, workflow.costUsd30d / fires30dEstimate);
}

export async function check(
  spawnId: string,
  workflow: AutomationWorkflowDetail,
  /** Override the tenant cap. Default is DEFAULT_CAP_USD. */
  capUsd: number = DEFAULT_CAP_USD,
): Promise<CapCheckResult> {
  const executions = await readExecutions(spawnId);
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  let current30d = 0;
  let oldestInWindow: number | null = null;
  for (const e of executions) {
    const ts = Date.parse(e.startedAt);
    if (Number.isNaN(ts) || ts < cutoff) continue;
    current30d += e.costCents / 100;
    if (oldestInWindow === null || ts < oldestInWindow) oldestInWindow = ts;
  }

  const estimated = estimateCost(workflow);
  if (current30d + estimated <= capUsd) {
    return { allowed: true, current30d, cap: capUsd, estimated };
  }

  const retryAfterSec = oldestInWindow
    ? Math.max(60, Math.ceil((oldestInWindow + WINDOW_MS - now) / 1000))
    : 60;
  return {
    allowed: false,
    reason: `tenant cost-cap breached: $${current30d.toFixed(2)} + $${estimated.toFixed(2)} > $${capUsd}`,
    current30d,
    cap: capUsd,
    estimated,
    retryAfterSec,
  };
}
