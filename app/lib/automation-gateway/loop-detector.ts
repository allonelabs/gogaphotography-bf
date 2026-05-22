// Runaway-loop detector — Tier-3 spec failure mode #1 (sev-1).
//
// Two checks:
//   1. Per-workflow rolling-60s rate < 60 (configurable per workflow).
//   2. Chain cycle: trigger-source not equal to a previous action target
//      within the same execution chain. Detects A→B→A loops.
//
// Violation → returns { allowed: false, reason } so the caller can
// auto-pause the workflow + emit a sev-1 alert.

interface RollingWindow {
  /** Sliding-window timestamps (ms epoch) of the last N executions. */
  ticks: number[];
}

const WINDOWS = new Map<string, RollingWindow>();
const WINDOW_MS = 60_000;
const DEFAULT_MAX_PER_MINUTE = 60;

/** Per-workflow override (e.g. payment-received can burst higher). */
const PER_WORKFLOW_MAX: Record<string, number> = {
  // Add overrides as the operator catalog grows.
  'wf-payment-pipeline': 200,
};

function key(spawnId: string, workflowId: string): string {
  return `${spawnId}::${workflowId}`;
}

export interface LoopCheckResult {
  allowed: boolean;
  reason?: string;
  rate?: number;
  cap?: number;
}

/**
 * Check whether a dispatch would cross the runaway-loop threshold.
 * Records the timestamp on success so subsequent calls advance the
 * window. Caller dispatches only when allowed=true.
 */
export function checkAndRecord(
  spawnId: string,
  workflowId: string,
  /** Optional ancestor chain — workflow ids that fired in the trigger lineage. */
  ancestors?: readonly string[],
): LoopCheckResult {
  // Cycle check: if the workflow appears in its own ancestor chain, it's
  // self-triggering — refuse before rate gate.
  if (ancestors && ancestors.includes(workflowId)) {
    return { allowed: false, reason: 'cycle: workflow appears in its own ancestor chain' };
  }

  const cap = PER_WORKFLOW_MAX[workflowId] ?? DEFAULT_MAX_PER_MINUTE;
  const k = key(spawnId, workflowId);
  const w = WINDOWS.get(k) ?? { ticks: [] };

  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  // Drop expired ticks.
  while (w.ticks.length > 0 && w.ticks[0]! < cutoff) {
    w.ticks.shift();
  }

  if (w.ticks.length >= cap) {
    WINDOWS.set(k, w);
    return {
      allowed: false,
      reason: `runaway: ${w.ticks.length} executions in 60s (cap ${cap})`,
      rate: w.ticks.length,
      cap,
    };
  }

  w.ticks.push(now);
  WINDOWS.set(k, w);
  return { allowed: true, rate: w.ticks.length, cap };
}

export function _resetForTest(): void { WINDOWS.clear(); }
