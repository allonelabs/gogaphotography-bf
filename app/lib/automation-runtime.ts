// ════════════════════════════════════════════════════════════════════════════
// automation-runtime — minimal in-process runtime that gives the same API
// surface Inngest (Plan 2's target runtime) will eventually swap into.
//
// Today this is a synchronous dispatcher: API routes call dispatchWorkflow()
// which reads the workflow cell, executes the action chain inline (with
// per-step retry against the workflow's policy), and persists an execution
// cell. When Inngest lands, dispatchWorkflow becomes an Inngest event-fire
// and the in-process executor disappears — the operator API surface and the
// cell persistence shape stay identical, so the UI doesn't change.
//
// Cell file shapes:
//   <out>/<spawnId>/.cells/automation-forge.workflow.<wid>.json   — definition
//   <out>/<spawnId>/.cells/automation-forge.execution.<exid>.json — per-run log
// ════════════════════════════════════════════════════════════════════════════
import 'server-only';

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

import type {
  AutomationExecution,
  AutomationWorkflowDetail,
} from '../data/mock-automations';
import { resolveOutRoot } from './spawn-loader';
import { checkAndRecord as checkLoop } from './automation-gateway/loop-detector';
import { check as checkCostCap } from './automation-gateway/cost-cap';

const PREFIX = 'automation-forge.';

function cellsDir(spawnId: string): string {
  return path.join(resolveOutRoot(), spawnId, '.cells');
}

async function ensureCellsDir(spawnId: string): Promise<string> {
  const dir = cellsDir(spawnId);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  return dir;
}

export async function readWorkflow(
  spawnId: string,
  wid: string,
): Promise<AutomationWorkflowDetail | null> {
  if (!/^[a-z0-9][a-z0-9.\-_]*$/i.test(spawnId)) return null;
  if (!/^[a-z0-9][a-z0-9.\-_]*$/i.test(wid)) return null;
  const file = path.join(cellsDir(spawnId), `${PREFIX}workflow.${wid}.json`);
  try {
    return JSON.parse(await readFile(file, 'utf8')) as AutomationWorkflowDetail;
  } catch {
    return null;
  }
}

export async function writeWorkflow(
  spawnId: string,
  workflow: AutomationWorkflowDetail,
): Promise<void> {
  const dir = await ensureCellsDir(spawnId);
  await writeFile(
    path.join(dir, `${PREFIX}workflow.${workflow.id}.json`),
    JSON.stringify(workflow, null, 2),
    'utf8',
  );
}

export async function readExecution(
  spawnId: string,
  exid: string,
): Promise<AutomationExecution | null> {
  if (!/^[a-z0-9][a-z0-9.\-_]*$/i.test(spawnId)) return null;
  if (!/^[a-z0-9][a-z0-9.\-_]*$/i.test(exid)) return null;
  const file = path.join(cellsDir(spawnId), `${PREFIX}execution.${exid}.json`);
  try {
    return JSON.parse(await readFile(file, 'utf8')) as AutomationExecution;
  } catch {
    return null;
  }
}

export async function writeExecution(
  spawnId: string,
  execution: AutomationExecution,
): Promise<void> {
  const dir = await ensureCellsDir(spawnId);
  await writeFile(
    path.join(dir, `${PREFIX}execution.${execution.id}.json`),
    JSON.stringify(execution, null, 2),
    'utf8',
  );
}

// ── runtime ops ────────────────────────────────────────────────────────

/** Pause a workflow. Disables future trigger dispatches. */
export async function pauseWorkflow(spawnId: string, wid: string): Promise<{ ok: boolean; error?: string }> {
  const w = await readWorkflow(spawnId, wid);
  if (!w) return { ok: false, error: 'workflow not found' };
  if (w.status === 'paused') return { ok: true };
  await writeWorkflow(spawnId, { ...w, status: 'paused', lastFiredAt: w.lastFiredAt });
  return { ok: true };
}

/** Resume a paused workflow. */
export async function resumeWorkflow(spawnId: string, wid: string): Promise<{ ok: boolean; error?: string }> {
  const w = await readWorkflow(spawnId, wid);
  if (!w) return { ok: false, error: 'workflow not found' };
  if (w.status !== 'paused') return { ok: true };
  await writeWorkflow(spawnId, { ...w, status: 'enabled' });
  return { ok: true };
}

/**
 * Synchronous workflow dispatch — the in-process Plan-2 stand-in for
 * Inngest. Reads the workflow, runs each action sequentially (no real
 * I/O — actions are simulated as deterministic successes for now),
 * persists an execution row, returns the result. Per-step retry logic
 * lives here as the no-op contract; when Inngest takes over, this body
 * becomes `await inngest.send({ name: trigger.event, data })`.
 */
export async function dispatchWorkflow(
  spawnId: string,
  wid: string,
  payload?: Record<string, unknown>,
  /** Workflow IDs in the trigger lineage. Used for cycle detection. */
  ancestors?: readonly string[],
): Promise<{ ok: boolean; executionId?: string; error?: string }> {
  const w = await readWorkflow(spawnId, wid);
  if (!w) return { ok: false, error: 'workflow not found' };
  if (w.status === 'paused') return { ok: false, error: 'workflow is paused' };
  if (w.status === 'draft') return { ok: false, error: 'workflow is a draft' };

  // Plan 5 — runaway-loop detector. Cycle + per-window rate gate.
  // Auto-pause on detection so the operator UI surfaces the reason.
  const loop = checkLoop(spawnId, wid, ancestors);
  if (!loop.allowed) {
    await writeWorkflow(spawnId, { ...w, status: 'paused' });
    return { ok: false, error: loop.reason ?? 'loop detected' };
  }

  // Plan 6 — per-tenant cost-cap. Refuse the dispatch when (current
  // 30d cost + estimated cost) > tenant cap. Operator's "raise cap"
  // affordance lives on /s/automations/cost.
  const cap = await checkCostCap(spawnId, w);
  if (!cap.allowed) {
    return { ok: false, error: cap.reason ?? 'cost cap exceeded' };
  }

  const startedAt = new Date().toISOString();
  const exid = `ex-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const t0 = Date.now();

  // Simulated action chain. Each action takes 50-200ms; deterministic
  // success when payload doesn't include {forceFail: true}. Replace with
  // real Inngest step.run() calls in the production runtime swap.
  let succeeded = true;
  let errorKind: AutomationExecution['errorKind'];
  let errorMessage: string | undefined;
  if (payload && (payload as { forceFail?: boolean }).forceFail) {
    succeeded = false;
    errorKind = 'transformer';
    errorMessage = 'Forced failure (operator-triggered test)';
  }
  for (const _step of w.actions) {
    await new Promise((r) => setTimeout(r, 30 + Math.floor(Math.random() * 70)));
    if (!succeeded) break;
  }
  const durationMs = Date.now() - t0;

  // Cost roll-up: sum of per-action costs (simulated 1-3¢ per action).
  const costCents = w.actions.length * (1 + Math.floor(Math.random() * 3));

  const execution: AutomationExecution = {
    id: exid,
    workflowId: wid,
    startedAt,
    durationMs,
    status: succeeded ? 'success' : 'failed',
    retryCount: 0,
    costCents,
    ...(errorKind && { errorKind }),
    ...(errorMessage && { errorMessage }),
  };
  await writeExecution(spawnId, execution);

  // Bump workflow stats (read-modify-write).
  await writeWorkflow(spawnId, {
    ...w,
    lastFiredAt: 'live',
    fired24h: w.fired24h + 1,
    succeeded24h: succeeded ? w.succeeded24h + 1 : w.succeeded24h,
    failed24h: succeeded ? w.failed24h : w.failed24h + 1,
  });

  return { ok: true, executionId: exid };
}

/**
 * Replay a previously-failed execution. Reads the execution cell, marks
 * it status='replayed', dispatches a fresh execution against the same
 * workflow.
 */
export async function replayExecution(
  spawnId: string,
  exid: string,
): Promise<{ ok: boolean; newExecutionId?: string; error?: string }> {
  const ex = await readExecution(spawnId, exid);
  if (!ex) return { ok: false, error: 'execution not found' };
  if (ex.status !== 'failed') return { ok: false, error: 'only failed executions can be replayed' };

  // Mark the old execution as replayed.
  await writeExecution(spawnId, { ...ex, status: 'replayed', retryCount: ex.retryCount + 1 });

  // Dispatch a fresh execution against the same workflow.
  const r = await dispatchWorkflow(spawnId, ex.workflowId);
  if (!r.ok || !r.executionId) {
    return { ok: false, error: r.error ?? 'dispatch failed' };
  }
  return { ok: true, newExecutionId: r.executionId };
}
